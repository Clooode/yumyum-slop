/*
 * Pure selection logic (no DOM), so it can be tested in Node.
 */
(function (root) {
  'use strict';

  // Global option -> what it does.
  //   filter: hard filter on a tag       weight: bigger wheel slice for a tag
  var MODES = {
    none:    { label: 'None',         note: 'Anything goes.' },
    veg:     { label: 'Vegetarian',   note: 'Only vegetarian-friendly ingredients are on the wheel.', filter: 'veg' },
    protein: { label: 'High protein', note: 'Protein-packed things get bigger slices.',              weight: 'protein' },
    lowcal:  { label: 'Lower calorie', note: 'Lighter things get bigger slices.',                    weight: 'lowcal' },
    fibre:   { label: 'High fibre',   note: 'Fibre-rich things get bigger slices.',                  weight: 'fibre' }
  };
  var BOOST = 3;

  function hasTag(ing, tag) {
    return ing.tags.indexOf(tag) !== -1;
  }

  // ctx: { off: {id: true}, mode: 'none', exclude: Set of ids }
  function isEligible(ing, ctx) {
    if (ctx.off && ctx.off[ing.id]) return false;
    if (ctx.exclude && ctx.exclude.has(ing.id)) return false;
    var m = MODES[ctx.mode];
    if (m && m.filter && !hasTag(ing, m.filter)) return false;
    return true;
  }

  function candidates(all, cat, ctx) {
    return all.filter(function (ing) {
      return ing.cat === cat && isEligible(ing, ctx);
    });
  }

  function weightOf(ing, mode) {
    var m = MODES[mode];
    return m && m.weight && hasTag(ing, m.weight) ? BOOST : 1;
  }

  // Choose up to `max` candidates for the wheel (weighted, no repeats) and
  // return them as [{ ing, w }] in a shuffled order.
  function sampleWheel(cands, mode, max, rng) {
    var keyed = cands.map(function (ing) {
      var w = weightOf(ing, mode);
      // Efraimidis-Spirakis: larger key = more likely to be kept.
      return { ing: ing, w: w, key: Math.pow(rng(), 1 / w) };
    });
    keyed.sort(function (a, b) { return b.key - a.key; });
    var chosen = keyed.slice(0, max);
    // Fisher-Yates so the order on the wheel is not sorted by key.
    for (var i = chosen.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = chosen[i]; chosen[i] = chosen[j]; chosen[j] = t;
    }
    return chosen.map(function (c) { return { ing: c.ing, w: c.w }; });
  }

  // Start angle of each slice (radians, 0..2pi) plus the end angle at the tail.
  function sliceAngles(items) {
    var total = items.reduce(function (s, it) { return s + it.w; }, 0);
    var out = [0], acc = 0;
    items.forEach(function (it) {
      acc += (it.w / total) * Math.PI * 2;
      out.push(acc);
    });
    return out;
  }

  // Which slice is under the pointer (at the top) for a wheel rotated by rot?
  function sliceAt(angles, rot) {
    var TAU = Math.PI * 2;
    var theta = (((-Math.PI / 2 - rot) % TAU) + TAU) % TAU;
    for (var i = 0; i < angles.length - 1; i++) {
      if (theta >= angles[i] && theta < angles[i + 1]) return i;
    }
    return angles.length - 2;
  }

  var api = {
    MODES: MODES,
    BOOST: BOOST,
    isEligible: isEligible,
    candidates: candidates,
    weightOf: weightOf,
    sampleWheel: sampleWheel,
    sliceAngles: sliceAngles,
    sliceAt: sliceAt
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SlopLogic = api;
})(typeof window !== 'undefined' ? window : this);
