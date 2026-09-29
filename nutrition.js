/*
 * Rough nutrition estimates for a typical portion of each ingredient.
 *
 * These are ballpark figures from general food-composition knowledge (cooked
 * weights where it makes sense, typical shop-bought products for sauces), NOT
 * lab data and not medical advice. Brands vary a lot, especially for sodium.
 * Edit any number freely.
 *
 * Each row:  'Ingredient name': [ portion, grams, kcal, protein g, carbs g, fat g, fibre g, sodium mg, { micros } ]
 * micros = % of the daily reference for one portion (only listed when it matters).
 *   iron calcium potassium magnesium zinc vitA vitC vitK folate b12
 */
(function (root) {
  'use strict';

  // Daily reference amounts (adult, ~2000 kcal / 8400 kJ day). Change to suit you.
  var DAILY = { kcal: 2000, protein: 50, carbs: 300, fat: 70, fibre: 30, sodium: 2000 };

  var MICROS = [
    { key: 'iron',      label: 'Iron' },
    { key: 'calcium',   label: 'Calcium' },
    { key: 'potassium', label: 'Potassium' },
    { key: 'magnesium', label: 'Magnesium' },
    { key: 'zinc',      label: 'Zinc' },
    { key: 'vitA',      label: 'Vitamin A' },
    { key: 'vitC',      label: 'Vitamin C' },
    { key: 'vitK',      label: 'Vitamin K' },
    { key: 'folate',    label: 'Folate' },
    { key: 'b12',       label: 'Vitamin B12' }
  ];

  var HIGH = 30;   // % of daily reference for "high in"
  var GOOD = 15;   // % for "good source of"

  // Short keys used in the table below.
  var K = { fe: 'iron', ca: 'calcium', k: 'potassium', mg: 'magnesium', zn: 'zinc', a: 'vitA', c: 'vitC', vk: 'vitK', fol: 'folate', b12: 'b12' };

  var T = {
    // ---------------------------------------------------------------- base
    'White rice':              ['150g cooked', 150, 195, 4, 43, 0.4, 0.6, 2, {}],
    'Brown rice':              ['150g cooked', 150, 165, 3.5, 34, 1.3, 2.6, 5, { mg: 15, zn: 5 }],
    'Quinoa':                  ['150g cooked', 150, 180, 6.6, 32, 2.9, 4, 10, { mg: 28, fe: 15, fol: 20, zn: 12 }],
    'Pearl couscous':          ['150g cooked', 150, 225, 7, 46, 1, 2.5, 10, {}],
    'Orzo':                    ['150g cooked', 150, 220, 8, 44, 1.2, 2.5, 5, {}],
    'Short pasta (farfalle)':  ['150g cooked', 150, 235, 8.5, 47, 1.5, 2.8, 5, {}],
    'Rice noodles':            ['150g cooked', 150, 165, 1.5, 37, 0.3, 1, 15, {}],
    'Egg noodles':             ['150g cooked', 150, 210, 7, 40, 2.7, 2, 15, { fe: 10 }],
    'Soba noodles':            ['150g cooked', 150, 170, 7, 36, 0.5, 2.5, 90, { mg: 8 }],
    'Udon noodles':            ['150g cooked', 150, 160, 4, 34, 0.5, 1.5, 250, {}],
    'Mini potatoes':           ['150g boiled', 150, 115, 3, 26, 0.2, 3, 10, { k: 18, c: 12 }],
    'Lentils (tin or pouch)':  ['120g drained', 120, 140, 10, 22, 0.5, 6, 200, { fe: 22, fol: 50, k: 10, zn: 12, mg: 12 }],
    'Mixed salad leaves':      ['50g', 50, 8, 0.7, 1.2, 0.1, 0.7, 15, { vk: 45, a: 15, fol: 8 }],
    'Shredded cabbage slaw':   ['80g', 80, 20, 1, 4.5, 0.1, 2, 15, { c: 35, vk: 45, fol: 10 }],

    // ------------------------------------------------------------- protein
    'Chicken breast (sliced)':      ['120g cooked', 120, 200, 37, 0, 4.3, 0, 90, { zn: 8 }],
    'Chicken thigh (sliced)':       ['120g cooked', 120, 250, 31, 0, 13, 0, 110, { zn: 20, b12: 8 }],
    'Rotisserie chicken (shredded)': ['120g', 120, 230, 30, 0, 12, 0, 400, { zn: 18, b12: 10 }],
    'Beef stir-fry strips':         ['120g cooked', 120, 250, 36, 0, 11, 0, 90, { fe: 25, zn: 55, b12: 100 }],
    'Deli ham':                     ['60g', 60, 65, 10, 1, 2, 0, 660, {}],
    'Deli turkey':                  ['60g', 60, 60, 11, 1, 1, 0, 600, {}],
    'Chorizo':                      ['40g', 40, 150, 8, 1, 13, 0, 550, { b12: 10 }],
    'Bacon':                        ['40g cooked', 40, 170, 12, 0.3, 13, 0, 600, {}],
    'Boiled eggs':                  ['2 eggs', 100, 155, 13, 1, 11, 0, 125, { b12: 45, a: 20, fol: 12, fe: 10, zn: 10 }],
    'Fried egg':                    ['2 eggs', 110, 200, 13, 1, 15, 0, 200, { b12: 45, a: 20, fol: 12, fe: 10, zn: 10 }],
    'Tinned tuna':                  ['95g drained', 95, 110, 24, 0, 1, 0, 250, { b12: 90, fe: 8 }],
    'Tinned salmon':                ['100g drained', 100, 140, 22, 0, 5.5, 0, 350, { b12: 100, ca: 15 }],
    'Smoked salmon':                ['60g', 60, 105, 15, 0, 4.5, 0, 550, { b12: 60 }],
    'Prawns (frozen)':              ['120g cooked', 120, 115, 26, 0, 1.3, 0, 250, { b12: 50, fe: 15, zn: 15 }],
    'Chickpeas (tin)':              ['130g drained', 130, 170, 10, 25, 3, 8, 200, { fol: 50, fe: 20, mg: 15, zn: 12, k: 8 }],
    'Black beans (tin)':            ['130g drained', 130, 150, 10, 27, 0.7, 9, 200, { fol: 40, fe: 18, mg: 20, k: 12, zn: 12 }],
    'Cannellini beans (tin)':       ['130g drained', 130, 145, 10, 26, 0.5, 8, 200, { fol: 30, fe: 20, mg: 15, k: 14 }],
    'Edamame (frozen)':             ['100g shelled', 100, 120, 11, 9, 5, 5, 6, { fol: 70, vk: 35, fe: 14, mg: 15, k: 10 }],
    'Halloumi':                     ['60g', 60, 200, 13, 1, 16, 0, 750, { ca: 40 }],
    'Falafel':                      ['4 pieces', 100, 280, 12, 28, 14, 6, 400, { fe: 20, fol: 35, mg: 15, zn: 12 }],

    // ----------------------------------------------------------- vegetables
    'Broccoli':                 ['80g', 80, 28, 2.3, 5, 0.3, 2.1, 30, { c: 55, vk: 90, fol: 22, k: 8 }],
    'Cauliflower florets':      ['80g', 80, 20, 1.5, 3.5, 0.2, 2, 25, { c: 40, vk: 15, fol: 15 }],
    'Carrot':                   ['60g', 60, 25, 0.6, 5.5, 0.1, 1.7, 40, { a: 55, vk: 10 }],
    'Cucumber':                 ['80g', 80, 12, 0.5, 2.5, 0.1, 0.4, 2, { vk: 15 }],
    'Cherry tomatoes':          ['80g', 80, 15, 0.7, 3, 0.2, 1, 4, { c: 15, a: 6, k: 6 }],
    'Baby spinach':             ['40g', 40, 9, 1.2, 1.4, 0.2, 0.9, 30, { vk: 160, a: 35, fol: 25, fe: 10, c: 12 }],
    'Rocket':                   ['30g', 30, 8, 0.8, 1, 0.2, 0.4, 8, { vk: 45, fol: 10, ca: 5 }],
    'Kale':                     ['40g', 40, 20, 1.7, 3.5, 0.4, 1.5, 15, { vk: 200, c: 50, a: 20, ca: 6 }],
    'Bok choy':                 ['80g', 80, 10, 1.1, 1.6, 0.1, 0.8, 60, { vk: 30, c: 35, a: 25, fol: 12 }],
    'Capsicum':                 ['80g', 80, 25, 0.8, 4.8, 0.2, 1.4, 3, { c: 90, a: 15 }],
    'Red onion':                ['30g', 30, 12, 0.3, 2.8, 0, 0.5, 1, {}],
    'Spring onion':             ['20g', 20, 6, 0.4, 1.4, 0, 0.6, 3, { vk: 34, c: 10, fol: 8 }],
    'Corn':                     ['80g', 80, 70, 2.5, 15, 1, 2, 5, { fol: 8, k: 6 }],
    'Zucchini':                 ['80g', 80, 14, 1, 2.5, 0.3, 0.9, 7, { c: 15, k: 8 }],
    'Eggplant':                 ['80g cooked', 80, 45, 1, 6, 2, 2.5, 5, {}],
    'Red cabbage':              ['60g', 60, 17, 0.8, 4, 0.1, 1.3, 12, { c: 35, vk: 30 }],
    'Green beans':              ['80g', 80, 25, 1.5, 5.5, 0.1, 2.5, 5, { vk: 20, c: 15, fol: 10 }],
    'Snow peas':                ['70g', 70, 30, 2, 5, 0.1, 2, 3, { c: 45, vk: 20, fol: 10 }],
    'Asparagus':                ['80g', 80, 16, 1.8, 3, 0.1, 1.7, 2, { vk: 28, fol: 12 }],
    'Bean sprouts':             ['50g', 50, 15, 1.5, 3, 0.1, 0.9, 3, { c: 10, fol: 12 }],
    'Avocado':                  ['70g', 70, 115, 1.4, 6, 10.3, 4.7, 5, { k: 14, fol: 20, vk: 20, c: 12, mg: 9 }],
    'Beetroot (vac-pack or tin)': ['60g', 60, 25, 1, 5.5, 0.1, 1.7, 60, { fol: 12, k: 7 }],
    'Frozen peas':              ['80g', 80, 62, 4, 8.5, 0.4, 4.4, 4, { vk: 16, c: 12, fol: 13, fe: 8 }],
    'Frozen stir-fry veg mix':  ['100g', 100, 35, 2, 6, 0.3, 2.5, 20, { c: 35, vk: 40, a: 20 }],
    'Frozen peas and corn mix': ['80g', 80, 65, 3.2, 12, 0.7, 3.2, 25, { vk: 10, c: 8 }],
    'Frozen mixed veg':         ['80g', 80, 55, 2.8, 10, 0.3, 3.3, 30, { a: 35, vk: 15 }],

    // ------------------------------------------------------------ interest
    'Quick-pickled red onion':  ['30g', 30, 15, 0.2, 3.5, 0, 0.4, 60, {}],
    'Quick-pickled cucumber':   ['50g', 50, 15, 0.3, 3.5, 0, 0.3, 120, {}],
    'Quick-pickled carrot':     ['40g', 40, 25, 0.4, 5.5, 0, 1, 100, { a: 35 }],
    'Pickled ginger':           ['15g', 15, 8, 0, 1.8, 0, 0.1, 150, {}],
    'Gherkins / cornichons':    ['40g', 40, 6, 0.2, 1, 0, 0.4, 350, { vk: 10 }],
    'Mango':                    ['80g', 80, 50, 0.7, 12, 0.3, 1.3, 1, { c: 30, a: 8, fol: 9 }],
    'Pineapple':                ['80g', 80, 40, 0.4, 10, 0.1, 1.2, 1, { c: 40 }],
    'Apple (thin slices)':      ['60g', 60, 32, 0.2, 8.5, 0.1, 1.4, 1, { c: 5 }],
    'Orange segments':          ['80g', 80, 38, 0.8, 9, 0.1, 1.9, 0, { c: 47, fol: 12 }],
    'Pomegranate seeds':        ['40g', 40, 33, 0.7, 7.5, 0.5, 1.6, 2, { c: 8, fol: 10, k: 5 }],
    'Grapes':                   ['60g', 60, 42, 0.4, 11, 0.1, 0.5, 1, { vk: 12 }],
    'Dried cranberries':        ['20g', 20, 65, 0, 16, 0.1, 1.2, 1, {}],
    'Sultanas':                 ['20g', 20, 60, 0.6, 15, 0.1, 0.7, 4, { k: 5, fe: 4 }],
    'Feta':                     ['30g', 30, 80, 4.2, 1, 6.4, 0, 320, { ca: 15, b12: 10 }],
    'Shaved parmesan':          ['15g', 15, 60, 5.4, 0.6, 4, 0, 200, { ca: 13, zn: 6 }],
    'Goat cheese':              ['30g', 30, 100, 6, 0.2, 8, 0, 130, { ca: 5, a: 8 }],
    'Bocconcini':               ['50g', 50, 125, 9, 1, 10, 0, 200, { ca: 19 }],
    'Grated cheddar':           ['25g', 25, 100, 6, 0.1, 8.3, 0, 160, { ca: 14, b12: 6 }],
    'Hummus':                   ['40g', 40, 100, 3, 7, 6.5, 2, 180, { fe: 8, fol: 8 }],
    'Guacamole':                ['50g', 50, 80, 0.8, 4, 7, 3, 200, { vk: 12, fol: 10, k: 8, c: 8 }],
    'Tzatziki':                 ['40g', 40, 40, 2, 2, 3, 0.2, 120, { ca: 6 }],
    'Fresh salsa':              ['50g', 50, 12, 0.5, 2.5, 0.1, 0.7, 100, { c: 10, k: 4 }],
    'Chilli crisp / chilli oil': ['1 tsp', 5, 35, 0.3, 0.8, 3.5, 0.2, 80, {}],
    'Coriander':                ['10g', 10, 2, 0.2, 0.4, 0, 0.3, 5, { vk: 25, a: 6 }],
    'Mint':                     ['5g', 5, 2, 0.2, 0.4, 0, 0.4, 1, { a: 3 }],
    'Basil':                    ['8g', 8, 2, 0.2, 0.2, 0, 0.2, 0, { vk: 28 }],
    'Dill':                     ['5g', 5, 2, 0.2, 0.4, 0, 0.1, 3, { vk: 8 }],
    'Lemon or lime wedge':      ['20g', 20, 5, 0.1, 1.5, 0, 0.3, 0, { c: 12 }],
    'Fresh chilli':             ['10g', 10, 4, 0.2, 0.9, 0, 0.3, 0, { c: 16 }],
    'Olives':                   ['30g', 30, 45, 0.3, 1.5, 4.5, 0.8, 450, {}],
    'Sun-dried tomatoes':       ['20g', 20, 40, 1, 4, 2.3, 1.4, 130, { k: 8, fe: 6, c: 5 }],
    'Roasted capsicum':         ['40g', 40, 15, 0.5, 2.5, 0.4, 0.8, 100, { c: 30, a: 10 }],
    'Marinated artichokes':     ['40g', 40, 35, 1, 3, 3, 1.5, 230, { vk: 10 }],
    'Capers':                   ['10g', 10, 2, 0.2, 0.4, 0, 0.3, 250, {}],

    // -------------------------------------------------------------- crunch
    'Peanuts':                  ['20g', 20, 115, 5, 3.5, 10, 1.7, 2, { fol: 12, mg: 11, zn: 6 }],
    'Cashews':                  ['20g', 20, 115, 3.6, 6, 9.5, 0.6, 3, { mg: 14, zn: 10, fe: 7 }],
    'Slivered almonds':         ['15g', 15, 87, 3.2, 3.2, 7.5, 1.9, 0, { mg: 9 }],
    'Sesame seeds':             ['8g', 8, 46, 1.4, 1.9, 4, 1, 3, { ca: 6, fe: 6, mg: 8 }],
    'Crispy fried shallots':    ['10g', 10, 55, 0.5, 4, 4, 0.3, 30, {}],
    'Croutons':                 ['20g', 20, 85, 2, 13, 3, 0.8, 200, {}],
    'Tortilla chips':           ['25g', 25, 125, 1.7, 16, 6, 1.3, 100, {}],
    'Pepitas / sunflower seeds': ['15g', 15, 85, 4.5, 1.5, 7, 0.8, 2, { mg: 21, zn: 10, fe: 8 }],
    'Chow mein noodles':        ['20g', 20, 100, 2.5, 12, 5, 0.8, 100, {}],
    'Crushed rice crackers':    ['15g', 15, 58, 1, 12, 0.6, 0.3, 100, {}],
    'Toasted coconut':          ['10g', 10, 66, 0.7, 2, 6.5, 1.6, 3, {}],
    'Nori strips':              ['2g', 2, 6, 1, 0.6, 0, 0.7, 12, { fol: 4 }],
    'Furikake':                 ['3g', 3, 12, 0.6, 1.4, 0.5, 0.2, 200, {}],
    'Crispy chickpeas':         ['30g', 30, 120, 5.5, 15, 5, 4.5, 120, { fol: 18, fe: 10 }],
    'Popcorn':                  ['15g', 15, 58, 1.7, 11, 0.7, 2.2, 40, { mg: 6 }],

    // --------------------------------------------------------------- sauce
    'Kewpie sesame dressing':   ['2 tbsp', 30, 120, 1.5, 6, 10, 0.5, 400, {}],
    'Kewpie mayo + sriracha':   ['1 tbsp + tsp', 20, 100, 0.3, 1.5, 10.5, 0, 150, {}],
    'Soy + sesame oil':         ['1 tbsp + tsp', 20, 45, 1.5, 1, 4, 0, 900, {}],
    'Satay / peanut sauce':     ['2 tbsp', 30, 80, 3, 5, 5.5, 0.6, 250, { mg: 5 }],
    'Tahini lemon':             ['2 tbsp', 30, 100, 3, 3, 9, 1.2, 60, { ca: 5, fe: 7, mg: 8 }],
    'Pesto':                    ['1 tbsp', 20, 90, 2, 1, 9, 0.3, 150, { ca: 6, vk: 15 }],
    'Teriyaki':                 ['2 tbsp', 30, 55, 1, 11, 0, 0, 690, {}],
    'Sweet chilli':             ['2 tbsp', 30, 60, 0.1, 15, 0, 0.2, 200, {}],
    'Hot sauce':                ['1 tsp', 5, 1, 0, 0.2, 0, 0, 100, {}],
    'Yoghurt garlic':           ['3 tbsp', 45, 30, 3, 2, 1, 0, 30, { ca: 7 }],
    'BBQ sauce':                ['2 tbsp', 30, 60, 0.3, 14, 0, 0.2, 350, {}],
    'Ranch':                    ['2 tbsp', 30, 120, 0.5, 2, 12, 0, 260, {}],
    'Miso ginger':              ['2 tbsp', 30, 60, 1, 5, 4, 0.3, 400, {}],
    'Lemon olive oil':          ['1 tbsp', 17, 115, 0, 0.3, 12.5, 0, 45, {}],
    'Honey mustard':            ['1.5 tbsp', 25, 90, 0.2, 8, 6, 0, 150, {}],
    'Lime chilli fish sauce':   ['2 tbsp', 30, 30, 1, 5, 0, 0, 700, {}],
    'Ponzu':                    ['2 tbsp', 30, 20, 1, 4, 0, 0, 900, {}],
    'Caesar':                   ['2 tbsp', 30, 150, 1, 1.5, 15.5, 0, 300, {}],
    'Kecap manis + chilli':     ['1 tbsp', 20, 40, 0.3, 9.5, 0, 0, 300, {}],
    'Chimichurri':              ['2 tbsp', 30, 110, 0.3, 1, 12, 0.3, 80, { vk: 60, c: 15 }],
    'Balsamic + olive oil':     ['1.5 tbsp', 20, 100, 0, 2, 9.5, 0, 5, {}]
  };

  // name -> plain object
  var TABLE = {};
  Object.keys(T).forEach(function (name) {
    var r = T[name];
    var micros = {};
    Object.keys(r[8]).forEach(function (k) { micros[K[k] || k] = r[8][k]; });
    TABLE[name] = {
      portion: r[0], grams: r[1], kcal: r[2], protein: r[3], carbs: r[4],
      fat: r[5], fibre: r[6], sodium: r[7], micros: micros
    };
  });

  function get(name) { return TABLE[name] || null; }

  // Sum up a list of ingredients (objects with a .name). Returns totals plus
  // the list of names that had no nutrition data.
  function total(ings) {
    var t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sodium: 0, grams: 0, micros: {}, missing: [], count: 0 };
    ings.forEach(function (ing) {
      var n = get(ing.name);
      if (!n) { t.missing.push(ing.name); return; }
      t.count++;
      ['kcal', 'protein', 'carbs', 'fat', 'fibre', 'sodium', 'grams'].forEach(function (f) { t[f] += n[f]; });
      Object.keys(n.micros).forEach(function (m) { t.micros[m] = (t.micros[m] || 0) + n.micros[m]; });
    });
    return t;
  }

  // Share of energy from each macro (protein/carbs 4 kcal/g, fat 9 kcal/g).
  function energySplit(t) {
    var p = t.protein * 4, c = t.carbs * 4, f = t.fat * 9;
    var sum = p + c + f;
    if (sum <= 0) return { protein: 0, carbs: 0, fat: 0 };
    return { protein: p / sum, carbs: c / sum, fat: f / sum };
  }

  var api = {
    DAILY: DAILY, MICROS: MICROS, HIGH: HIGH, GOOD: GOOD,
    TABLE: TABLE, get: get, total: total, energySplit: energySplit
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SlopNutrition = api;
})(typeof window !== 'undefined' ? window : this);
