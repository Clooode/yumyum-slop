/*
 * Ingredient data. Edit this file to add / remove / retag things.
 *
 * Each row is:  [ "Name", "tags", "optional hint" ]
 *
 * tags is a string of letters:
 *   v = vegetarian-friendly (Vegetarian mode only keeps these)
 *   p = high protein   (bigger slice in "High protein" mode)
 *   l = lower calorie  (bigger slice in "Lower calorie" mode)
 *   f = high fibre     (bigger slice in "High fibre" mode)
 *
 * Rule of thumb for what goes in here: you can shop for it and cook it in a
 * lunch break, or prep it the evening before.
 */
(function (root) {
  'use strict';

  var CATEGORIES = [
    { id: 'base',     label: 'Base',       defaultCount: 1, max: 5 },
    { id: 'protein',  label: 'Protein',    defaultCount: 1, max: 5 },
    { id: 'veg',      label: 'Vegetables', defaultCount: 3, max: 6 },
    { id: 'interest', label: 'Interest',   defaultCount: 1, max: 5 },
    { id: 'crunch',   label: 'Crunch',     defaultCount: 1, max: 5 },
    { id: 'sauce',    label: 'Sauce',      defaultCount: 1, max: 5 }
  ];

  var RAW = {
    base: [
      ['White rice', 'v'],
      ['Brown rice', 'vf', 'microwave pouch if short on time'],
      ['Quinoa', 'vpf'],
      ['Pearl couscous', 'v'],
      ['Orzo', 'v'],
      ['Short pasta (farfalle)', 'v'],
      ['Rice noodles', 'v'],
      ['Egg noodles', 'v'],
      ['Soba noodles', 'vf'],
      ['Udon noodles', 'v'],
      ['Mini potatoes', 'vf', 'boil, then smash or halve'],
      ['Lentils (tin or pouch)', 'vpf'],
      ['Mixed salad leaves', 'vl'],
      ['Shredded cabbage slaw', 'vlf']
    ],

    protein: [
      ['Chicken breast (sliced)', 'pl', 'pan-fry thin slices'],
      ['Chicken thigh (sliced)', 'p', 'pan-fry thin slices'],
      ['Rotisserie chicken (shredded)', 'p', 'buy: supermarket chook'],
      ['Beef stir-fry strips', 'p'],
      ['Deli ham', 'pl'],
      ['Deli turkey', 'pl'],
      ['Chorizo', '', 'slice and fry'],
      ['Bacon', '', 'fry, then chop'],
      ['Boiled eggs', 'vpl', 'boil the night before'],
      ['Fried egg', 'vp'],
      ['Tinned tuna', 'pl'],
      ['Tinned salmon', 'p'],
      ['Smoked salmon', 'p'],
      ['Prawns (frozen)', 'pl', 'thaw in the morning, 3 min in the pan'],
      ['Chickpeas (tin)', 'vpf'],
      ['Black beans (tin)', 'vpf'],
      ['Cannellini beans (tin)', 'vpf'],
      ['Edamame (frozen)', 'vpf'],
      ['Halloumi', 'vp', 'fry slices'],
      ['Falafel', 'vpf', 'bought; bake 15 min']
    ],

    veg: [
      ['Broccoli', 'vlf'],
      ['Cauliflower florets', 'vlf', 'roast or steam'],
      ['Carrot', 'vlf'],
      ['Cucumber', 'vl'],
      ['Cherry tomatoes', 'vl'],
      ['Baby spinach', 'vlf'],
      ['Rocket', 'vl'],
      ['Kale', 'vlf'],
      ['Bok choy', 'vlf'],
      ['Capsicum', 'vl'],
      ['Red onion', 'vl'],
      ['Spring onion', 'vl'],
      ['Corn', 'vf'],
      ['Zucchini', 'vl'],
      ['Eggplant', 'vlf'],
      ['Red cabbage', 'vlf'],
      ['Green beans', 'vlf'],
      ['Snow peas', 'vlf'],
      ['Asparagus', 'vlf'],
      ['Bean sprouts', 'vl'],
      ['Avocado', 'vf'],
      ['Beetroot (vac-pack or tin)', 'vlf'],
      ['Frozen peas', 'vf'],
      ['Frozen stir-fry veg mix', 'vlf'],
      ['Frozen peas and corn mix', 'vf'],
      ['Frozen mixed veg', 'vf']
    ],

    interest: [
      ['Quick-pickled red onion', 'vl', 'quick pickle: vinegar + pinch sugar + salt, 30 min'],
      ['Quick-pickled cucumber', 'vl', 'quick pickle: vinegar + pinch sugar + salt, 30 min'],
      ['Quick-pickled carrot', 'vl', 'quick pickle: vinegar + pinch sugar + salt, 30 min'],
      ['Pickled ginger', 'vl'],
      ['Gherkins / cornichons', 'vl'],

      ['Mango', 'v'],
      ['Pineapple', 'v'],
      ['Apple (thin slices)', 'vf'],
      ['Orange segments', 'vf'],
      ['Pomegranate seeds', 'vf'],
      ['Grapes', 'v'],
      ['Dried cranberries', 'v'],
      ['Sultanas', 'v'],

      ['Feta', 'v'],
      ['Shaved parmesan', 'v'],
      ['Goat cheese', 'v'],
      ['Bocconcini', 'vp'],
      ['Grated cheddar', 'v'],

      ['Hummus', 'vf'],
      ['Guacamole', 'vf'],
      ['Tzatziki', 'v'],
      ['Fresh salsa', 'vl', 'tomato, onion, coriander, lime'],
      ['Chilli crisp / chilli oil', 'v'],

      ['Coriander', 'vl'],
      ['Mint', 'vl'],
      ['Basil', 'vl'],
      ['Dill', 'vl'],
      ['Lemon or lime wedge', 'vl'],
      ['Fresh chilli', 'vl'],

      ['Olives', 'v'],
      ['Sun-dried tomatoes', 'vf'],
      ['Roasted capsicum', 'vl'],
      ['Marinated artichokes', 'v'],
      ['Capers', 'vl']
    ],

    crunch: [
      ['Peanuts', 'vpf'],
      ['Cashews', 'vp'],
      ['Slivered almonds', 'vpf'],
      ['Sesame seeds', 'vf'],
      ['Crispy fried shallots', 'v'],
      ['Croutons', 'v'],
      ['Tortilla chips', 'v'],
      ['Pepitas / sunflower seeds', 'vpf'],
      ['Chow mein noodles', 'v'],
      ['Crushed rice crackers', 'vl'],
      ['Toasted coconut', 'vf'],
      ['Nori strips', 'vl'],
      ['Furikake', 'l', 'usually contains fish'],
      ['Crispy chickpeas', 'vpf', 'roast a tin with oil + salt, 25 min'],
      ['Popcorn', 'vlf']
    ],

    sauce: [
      ['Kewpie sesame dressing', 'v', 'buy: roasted sesame dressing'],
      ['Kewpie mayo + sriracha', 'v', 'mix about 3 : 1'],
      ['Soy + sesame oil', 'vl', 'jar: 2 tbsp soy, 1 tsp sesame oil, 1 tsp rice vinegar'],
      ['Satay / peanut sauce', 'v', 'buy, or jar: 2 tbsp peanut butter, 1 tbsp soy, 1 tbsp lime, warm water'],
      ['Tahini lemon', 'v', 'jar: 2 tbsp tahini, juice of half a lemon, 2 tbsp water, pinch salt'],
      ['Pesto', 'v', 'buy'],
      ['Teriyaki', 'v', 'buy'],
      ['Sweet chilli', 'v', 'buy'],
      ['Hot sauce', 'vl', 'buy'],
      ['Yoghurt garlic', 'vl', 'jar: 1/4 cup Greek yoghurt, 1 crushed garlic clove, squeeze of lemon, salt'],
      ['BBQ sauce', 'v', 'buy'],
      ['Ranch', 'v', 'buy'],
      ['Miso ginger', 'vl', 'jar: 1 tbsp white miso, 1 tsp grated ginger, 1 tbsp rice vinegar, 1 tbsp oil, 1 tsp honey, splash of water'],
      ['Lemon olive oil', 'v', 'jar: 3 tbsp olive oil, 1 tbsp lemon juice, salt, pepper, pinch sugar'],
      ['Honey mustard', 'v', 'jar: 1 tbsp Dijon, 1 tbsp honey, 2 tbsp olive oil, 1 tbsp vinegar'],
      ['Lime chilli fish sauce', 'l', 'jar: 2 tbsp lime juice, 1 tbsp fish sauce, 1 tsp sugar, chopped chilli'],
      ['Ponzu', 'l', 'buy'],
      ['Caesar', '', 'buy'],
      ['Kecap manis + chilli', 'v', 'buy kecap manis, add chilli'],
      ['Chimichurri', 'vl', 'jar: parsley, garlic, red wine vinegar, olive oil, salt'],
      ['Balsamic + olive oil', 'vl', 'jar: 1 part balsamic, 2 parts olive oil, salt']
    ]
  };

  var TAG_NAMES = { v: 'veg', p: 'protein', l: 'lowcal', f: 'fibre' };

  function slug(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  var INGREDIENTS = [];
  CATEGORIES.forEach(function (cat) {
    (RAW[cat.id] || []).forEach(function (row) {
      var tags = [];
      row[1].split('').forEach(function (ch) {
        if (TAG_NAMES[ch]) tags.push(TAG_NAMES[ch]);
      });
      INGREDIENTS.push({
        id: cat.id + ':' + slug(row[0]),
        name: row[0],
        cat: cat.id,
        tags: tags,
        hint: row[2] || ''
      });
    });
  });

  var api = { CATEGORIES: CATEGORIES, INGREDIENTS: INGREDIENTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SLOP_DATA = api;
})(typeof window !== 'undefined' ? window : this);
