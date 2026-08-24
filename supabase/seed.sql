-- Seed data for Veggies Grocery Platform

-- Clear existing data
truncate public.order_items cascade;
truncate public.orders cascade;
truncate public.cart_items cascade;
truncate public.products cascade;
truncate public.categories cascade;
truncate public.coupons cascade;

-- Insert Categories
insert into public.categories (id, name, slug, description, image_url, order_index) values
('c1111111-1111-1111-1111-111111111111', 'Fresh Fruits', 'fresh-fruits', 'Vibrant and delicious fresh handpicked fruits', 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?q=80&w=400', 1),
('c2222222-2222-2222-2222-222222222222', 'Fresh Vegetables', 'fresh-vegetables', 'Daily essential fresh vegetables for cooking', 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?q=80&w=400', 2),
('c3333333-3333-3333-3333-333333333333', 'Leafy Vegetables', 'leafy-vegetables', 'Healthy greens and aromatic herbs', 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=400', 3),
('c4444444-4444-4444-4444-444444444444', 'Organic Greens', 'organic-greens', '100% certified pesticide-free organic produce', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=400', 4),
('c5555555-5555-5555-5555-555555555555', 'Seasonal Delights', 'seasonal-delights', 'Seasonal favorites available during harvest', 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=400', 5),
('c6666666-6666-6666-6666-666666666666', 'Exotic Veggies', 'exotic-veggies', 'Premium global ingredients and gourmet produce', 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ecf?q=80&w=400', 6);

-- Insert Products
insert into public.products (id, category_id, name, slug, description, price, original_price, discount, weight, stock, delivery_time, images, nutrition, origin, shelf_life, benefits, is_organic, is_seasonal, is_exotic, rating, reviews_count) values
-- Fresh Fruits
(gen_random_uuid(), 'c1111111-1111-1111-1111-111111111111', 'Royal Gala Apple', 'royal-gala-apple', 'Crisp, sweet, and aromatic premium Royal Gala apples imported from New Zealand. Perfect for snaking or salads.', 120.00, 150.00, 20.00, '4 pcs (approx 500g)', 45, '10 mins', array['https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=400'], '{"calories": 95, "carbs": "25g", "vitamin_c": "14%"}'::jsonb, 'New Zealand', 'Up to 14 days in fridge', array['High in dietary fiber', 'Boosts heart health', 'Great source of Vitamin C'], false, false, false, 4.8, 124),
(gen_random_uuid(), 'c1111111-1111-1111-1111-111111111111', 'Organic Robusta Banana', 'organic-banana', 'Rich, creamy, and naturally sweetened organic bananas sourced directly from local organic farms.', 45.00, 60.00, 25.00, '500g (approx 4-5 pcs)', 80, '10 mins', array['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=400'], '{"calories": 105, "potassium": "422mg", "vitamin_b6": "33%"}'::jsonb, 'Karnataka, India', '3-5 days', array['Excellent energy booster', 'Supports digestive health', 'Rich in potassium and antioxidants'], true, false, false, 4.6, 98),
(gen_random_uuid(), 'c1111111-1111-1111-1111-111111111111', 'Alphonso Mango', 'alphonso-mango', 'The King of Mangoes! Premium quality Devgad Alphonso mangoes, known for their sweet aroma and rich pulp.', 240.00, 300.00, 20.00, '2 pcs (approx 600g)', 15, '10 mins', array['https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=400'], '{"calories": 201, "vitamin_a": "36%", "vitamin_c": "100%"}'::jsonb, 'Maharashtra, India', '2-4 days', array['Protects eyesight via Vitamin A', 'Boosts immunity', 'Aromatic culinary addition'], false, true, false, 4.9, 142),

-- Fresh Vegetables
(gen_random_uuid(), 'c2222222-2222-2222-2222-222222222222', 'Hybrid Tomato', 'hybrid-tomato', 'Plump, juicy tomatoes locally sourced. Essential base for curries, soups, and daily Indian cooking.', 32.00, 45.00, 28.00, '1 kg', 120, '10 mins', array['https://images.unsplash.com/photo-1595855759920-86582396756a?q=80&w=400'], '{"calories": 22, "water": "95%", "lycopene": "High"}'::jsonb, 'Local Farms', '4-7 days', array['Rich in Lycopene (antioxidant)', 'Good for skin health', 'Low calorie cooking essential'], false, false, false, 4.4, 320),
(gen_random_uuid(), 'c2222222-2222-2222-2222-222222222222', 'Nashik Red Onion', 'red-onion', 'High quality Nashik red onions with strong flavor and crisp texture, suitable for raw salads and frying.', 48.00, 60.00, 20.00, '1 kg', 200, '10 mins', array['https://images.unsplash.com/photo-1508747703725-719ae2c73ee8?q=80&w=400'], '{"calories": 44, "fiber": "1.9g", "vitamin_c": "12%"}'::jsonb, 'Nashik, Maharashtra', 'Up to 30 days stored dry', array['Contains anti-inflammatory compounds', 'Controls blood sugar levels', 'Essential culinary flavoring'], false, false, false, 4.5, 410),
(gen_random_uuid(), 'c2222222-2222-2222-2222-222222222222', 'Premium Potato (Jyoti)', 'premium-potato', 'Freshly harvested Jyoti potatoes, thin-skinned and highly versatile for baking, frying, or boiling.', 38.00, 45.00, 15.00, '1 kg', 250, '10 mins', array['https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=400'], '{"calories": 110, "carbs": "26g", "potassium": "15%"}'::jsonb, 'Punjab, India', 'Up to 20 days stored cool', array['High in complex carbohydrates', 'Provides vitamin B6 and potassium', 'Extremely versatile cooking base'], false, false, false, 4.3, 385),

-- Leafy Vegetables
(gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', 'Fresh Spinach (Palak)', 'fresh-spinach', 'Crisp, hydro-cooled leafy green spinach, free from dirt and chemical residues. Sourced daily.', 22.00, 30.00, 26.00, '250g bunch', 50, '10 mins', array['https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=400'], '{"calories": 7, "iron": "15%", "calcium": "8%"}'::jsonb, 'Local Greenhouses', '2-3 days in fridge', array['Very high in dietary Iron', 'Great for eye health', 'Lowers oxidative stress'], false, false, false, 4.7, 85),
(gen_random_uuid(), 'c3333333-3333-3333-3333-333333333333', 'Fresh Coriander (Dhaniya)', 'fresh-coriander', 'Highly aromatic coriander leaves. Essential garnish for Indian dishes and making green chutneys.', 12.00, 20.00, 40.00, '100g bunch', 100, '10 mins', array['https://images.unsplash.com/photo-1597362925123-77861d3fbac7?q=80&w=400'], '{"calories": 4, "vitamin_k": "310%"}'::jsonb, 'Local Farms', '2-3 days wrapped in paper', array['Aids digestion', 'Rich in Vitamin K', 'Powerful heavy-metal detoxifier'], false, false, false, 4.8, 220),

-- Organic Greens
(gen_random_uuid(), 'c4444444-4444-4444-4444-444444444444', 'Organic Hass Avocado', 'organic-avocado', 'Imported organic Hass avocados. Super buttery texture, loaded with healthy monounsaturated fats.', 190.00, 250.00, 24.00, '1 pc (approx 200g)', 25, '10 mins', array['https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?q=80&w=400'], '{"calories": 240, "fat": "22g", "fiber": "10g"}'::jsonb, 'Mexico', '3-5 days', array['High in heart-healthy monounsaturated fats', 'Contains more potassium than bananas', 'Rich in gut-friendly fiber'], true, false, true, 4.6, 54),
(gen_random_uuid(), 'c4444444-4444-4444-4444-444444444444', 'Organic Ginger', 'organic-ginger', 'Spicy, fibrous organic ginger roots grown without chemical fertilizers. Adds strong warmth to teas and foods.', 65.00, 80.00, 18.00, '250g', 35, '10 mins', array['https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=400'], '{"gingerol": "High", "anti-inflammatory": "Yes"}'::jsonb, 'Sikkim, India', '10-15 days in fridge', array['Relieves nausea and indigestion', 'Strong anti-inflammatory properties', 'Fights flu and common colds'], true, false, false, 4.5, 41),

-- Seasonal Delights
(gen_random_uuid(), 'c5555555-5555-5555-5555-555555555555', 'Fresh Strawberry Box', 'fresh-strawberry', 'Sweet, juicy, and ruby-red strawberries harvested at peak ripeness. Ideal for desserts or milkshakes.', 95.00, 130.00, 26.00, '200g box', 18, '10 mins', array['https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=400'], '{"calories": 64, "vitamin_c": "140%", "antioxidants": "High"}'::jsonb, 'Mahabaleshwar, India', '2-4 days', array['Very high in Vitamin C', 'Improves skin elasticity', 'Reduces blood pressure and cholesterol'], false, true, false, 4.7, 73),

-- Exotic Veggies
(gen_random_uuid(), 'c6666666-6666-6666-6666-666666666666', 'Broccoli Florets', 'exotic-broccoli', 'Premium exotic green broccoli head. Crisp, crunchy, and rich in vitamins. Perfect for stir-fries and pasta.', 85.00, 110.00, 22.00, '1 pc (approx 300g)', 30, '10 mins', array['https://images.unsplash.com/photo-1568584711075-3d021a7c3ecf?q=80&w=400'], '{"calories": 31, "protein": "2.5g", "vitamin_c": "115%"}'::jsonb, 'Ooty, India', '4-6 days in fridge', array['Contains cancer-fighting compounds', 'Improves bone density via Vitamin K', 'Helps in natural detoxification'], false, false, true, 4.6, 68),
(gen_random_uuid(), 'c6666666-6666-6666-6666-666666666666', 'Tri-Color Bell Peppers', 'bell-peppers-trio', 'Fresh pack of red, yellow, and green bell peppers. Adds beautiful colors and sweet crunch to salads and pizzas.', 125.00, 160.00, 21.00, '3 pcs (approx 450g)', 40, '10 mins', array['https://images.unsplash.com/photo-1566393028639-d108a42c46a7?q=80&w=400'], '{"calories": 40, "vitamin_c": "250%"}'::jsonb, 'Ooty, India', '5-7 days', array['Extremely high source of Vitamin C', 'Supports eye and skin health', 'Low in calories, high in hydration'], false, false, true, 4.7, 92);

-- Insert Coupons
insert into public.coupons (id, code, discount_type, discount_value, min_order_value, max_discount, start_date, end_date, is_active) values
(gen_random_uuid(), 'VEGGIES100', 'flat', 100.00, 499.00, 100.00, now(), now() + interval '30 days', true),
(gen_random_uuid(), 'FRESH20', 'percentage', 20.00, 299.00, 80.00, now(), now() + interval '60 days', true),
(gen_random_uuid(), 'WELCOME50', 'flat', 50.00, 199.00, 50.00, now(), now() + interval '365 days', true);
