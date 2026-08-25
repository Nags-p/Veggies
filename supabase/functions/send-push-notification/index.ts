import { createClient } from "jsr:@supabase/supabase-js";
import { SignJWT, importPKCS8 } from "npm:jose";

// Deno entry point
Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    // Secure webhook verification if JWT is configured
    
    // Parse Database Webhook Payload
    const payload = await req.json();
    console.log("Database webhook payload received:", JSON.stringify(payload));

    const { type, table, record, old_record } = payload;
    if (table !== "orders" && table !== "notifications") {
      return new Response(JSON.stringify({ error: "Unsupported table" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase Client with Admin service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Get Firebase Service Account from environment variables
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountJson) {
      console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is not set. Skipping push notifications.");
      return new Response(JSON.stringify({ message: "Firebase service account not configured. Notification skipped." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    // Determine target recipient, notification title, and body
    const tokensToSend: string[] = [];
    let title = "";
    let body = "";

    if (table === "notifications" && type === "INSERT") {
      // Direct notification inserted: Notify the target recipient
      title = record.title;
      body = record.message;

      const { data: recipientProfile, error: recErr } = await supabase
        .from("profiles")
        .select("fcm_token")
        .eq("id", record.profile_id)
        .single();

      if (recErr) {
        console.error("Error fetching recipient profile:", recErr);
      } else if (recipientProfile?.fcm_token) {
        tokensToSend.push(recipientProfile.fcm_token);
      }
    } else if (table === "orders" && type === "INSERT") {
      // New Order: Notify Admins
      title = "New Order Placed!";
      const displayId = record.id.slice(0, 8).toUpperCase();
      body = `Order #${displayId} has been placed for ₹${parseFloat(record.net_amount).toFixed(2)}`;

      const { data: admins, error: adminErr } = await supabase
        .from("profiles")
        .select("fcm_token")
        .eq("role", "admin");

      if (adminErr) {
        console.error("Error fetching admin profiles:", adminErr);
      } else if (admins) {
        admins.forEach((adm) => {
          if (adm.fcm_token) tokensToSend.push(adm.fcm_token);
        });
      }
    } else if (type === "UPDATE") {
      // Status Update: Notify Customer
      if (record.status !== old_record.status) {
        const displayId = record.id.slice(0, 8).toUpperCase();
        title = "Order Update";
        
        const statusFriendlyMap: Record<string, string> = {
          pending: "Waiting for store approval",
          confirmed: "Confirmed and accepted by the store",
          preparing: "Being sorted and packed",
          out_for_delivery: "Out for delivery! Our rider is on the way",
          delivered: "Delivered successfully! Enjoy your fresh veggies!",
          cancelled: "Cancelled",
        };

        const statusText = statusFriendlyMap[record.status] || record.status;
        body = `Your order #${displayId} is now: ${statusText}`;
        if (record.status === "cancelled" && record.cancel_reason) {
          body += ` (Reason: ${record.cancel_reason})`;
        }

        const { data: customerProfile, error: customerErr } = await supabase
          .from("profiles")
          .select("fcm_token")
          .eq("id", record.profile_id)
          .single();

        if (customerErr) {
          console.error("Error fetching customer profile:", customerErr);
        } else if (customerProfile?.fcm_token) {
          tokensToSend.push(customerProfile.fcm_token);
        }
      }
    }

    if (tokensToSend.length === 0) {
      console.log("No valid FCM tokens found to notify.");
      return new Response(JSON.stringify({ message: "No tokens found. Notification skipped." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get FCM OAuth 2.0 Access Token
    console.log("Generating FCM OAuth access token...");
    const accessToken = await getAccessToken(serviceAccount);

    // Send notifications to FCM
    const projectId = serviceAccount.project_id;
    const sendPromises = tokensToSend.map(async (token) => {
      const isNewOrder = table === "orders" && type === "INSERT";
      
      const fcmPayload: any = {
        message: {
          token: token,
          data: {
            orderId: table === "orders" ? record.id : "",
            notificationId: table === "notifications" ? record.id : "",
            title: title,
            body: body,
            isNewOrder: isNewOrder ? "true" : "false",
            redirectTo: record.redirect_to || "",
            imageUrl: record.image_url || "",
          },
          android: {
            priority: "high",
          },
        },
      };

      // For customer updates (UPDATE) and manual notifications, we include the "notification" block so they see standard system notifications easily
      if (!isNewOrder || table === "notifications") {
        fcmPayload.message.notification = {
          title: title,
          body: body,
        };

        if (record.image_url) {
          fcmPayload.message.notification.image = record.image_url;
        }

        fcmPayload.message.android.notification = {
          sound: "default",
          channel_id: "customer_order_alerts",
        };

        if (record.image_url) {
          fcmPayload.message.android.notification.image = record.image_url;
        }
      }

      try {
        const fcmResponse = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(fcmPayload),
          }
        );

        const responseText = await fcmResponse.text();
        console.log(`FCM send result for token ${token.slice(0, 10)}... :`, responseText);
      } catch (sendErr) {
        console.error("Failed to send to FCM endpoint:", sendErr);
      }
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ success: true, notifiedCount: tokensToSend.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Helper function to exchange Service Account JWT for Google OAuth2 access token
async function getAccessToken(serviceAccount: any) {
  const jwt = await new SignJWT({
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(await importPKCS8(serviceAccount.private_key, "RS256"));

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json();
  if (!data.access_token) {
    throw new Error(`Failed to retrieve OAuth token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}
