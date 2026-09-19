-- Parosa demo data: the Raj Darbar restaurant + menu used on the landing page
-- and for testing. Idempotent — safe to run more than once.
do $$
declare
  rid uuid;
  c_tandoor uuid; c_curries uuid; c_biryani uuid; c_chinese uuid; c_sweets uuid; c_drinks uuid;
begin
  select id into rid from restaurants where slug = 'raj-darbar';
  if rid is null then
    insert into restaurants (slug, name, owner_name, type, visitors, gstin, fssai, address, city, tagline)
    values ('raj-darbar','Raj Darbar','Owner','Restaurant','50–100','06ABCDE1234F1Z5','10012345000123','NH-48, Kherki Daula, Gurugram','Gurugram','Royal North-Indian since 1994')
    returning id into rid;
  end if;

  if not exists (select 1 from categories where restaurant_id = rid) then
    insert into categories (restaurant_id,name,sort_order) values (rid,'Tandoor',1) returning id into c_tandoor;
    insert into categories (restaurant_id,name,sort_order) values (rid,'Curries',2) returning id into c_curries;
    insert into categories (restaurant_id,name,sort_order) values (rid,'Biryani',3) returning id into c_biryani;
    insert into categories (restaurant_id,name,sort_order) values (rid,'Chinese',4) returning id into c_chinese;
    insert into categories (restaurant_id,name,sort_order) values (rid,'Sweets',5) returning id into c_sweets;
    insert into categories (restaurant_id,name,sort_order) values (rid,'Drinks',6) returning id into c_drinks;

    insert into dishes (restaurant_id,category_id,name,description,price,is_veg,tag,available,sort_order) values
      (rid,c_tandoor,'Tandoori Chicken','Clay-oven charred · 24-hr marinade',320,false,'best',true,1),
      (rid,c_tandoor,'Paneer Tikka','Chargrilled · mint chutney',240,true,'',true,2),
      (rid,c_tandoor,'Malai Soya Chaap','Creamy · mildly spiced',220,true,'',false,3),
      (rid,c_tandoor,'Tandoori Prawns','Jumbo prawns · lemon butter',420,false,'new',true,4),
      (rid,c_curries,'Butter Chicken','Silky tomato gravy · cream',340,false,'best',true,1),
      (rid,c_curries,'Dal Makhani','Black lentils · overnight · ghee',220,true,'',true,2),
      (rid,c_curries,'Paneer Butter Masala','Cashew-tomato · soft paneer',260,true,'',true,3),
      (rid,c_biryani,'Hyderabadi Biryani','Dum chicken · saffron · raita',280,false,'best',true,1),
      (rid,c_biryani,'Veg Dum Biryani','Basmati · seasonal veg · raita',220,true,'',true,2),
      (rid,c_chinese,'Chilli Paneer','Crispy · sweet-hot',230,true,'',true,1),
      (rid,c_chinese,'Hakka Noodles','Wok-tossed · garlic · veg',190,true,'',true,2),
      (rid,c_sweets,'Gulab Jamun','2 pcs · warm · cardamom syrup',90,true,'',true,1),
      (rid,c_drinks,'Sweet Lassi','Thick · malai · chilled',80,true,'',true,1),
      (rid,c_drinks,'Masala Chai','Ginger-cardamom · kettle-brewed',40,true,'',true,2);
  end if;
end $$;

