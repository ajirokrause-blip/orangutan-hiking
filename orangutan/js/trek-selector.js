(function () {
  var blocks = Array.prototype.slice.call(document.querySelectorAll('.trek-block'));
  if (!blocks.length) return;

  var mapStops = Array.prototype.slice.call(document.querySelectorAll('.map-stop'));
  var path = document.getElementById('mapPathActive');
  var hudKicker = document.getElementById('hudKicker');
  var hudName = document.getElementById('hudName');
  var hudMeta = document.getElementById('hudMeta');

  var names = ['Easy trek', 'Relax trek', 'Orangutan trek', 'Explore trek', 'Adventure trek', 'Adventure long trek'];
  var metas = [
    ['4 hours', '&#8364;35'],
    ['6–7 hours', '&#8364;60'],
    ['2 days, 1 night', '&#8364;110'],
    ['3 days, 2 nights', '&#8364;155'],
    ['4 days, 3 nights', '&#8364;240'],
    ['5 days, 4 nights', '&#8364;310']
  ];
  var kickers = [
    'Depth 1 &middot; forest edge',
    'Depth 2 &middot; canopy shade',
    'Depth 3 &middot; river camp',
    'Depth 4 &middot; deep understory',
    'Depth 5 &middot; remote terrain',
    'Depth 6 &middot; furthest reach'
  ];

  var totalLength = path.getTotalLength();
  var stopLengths = mapStops.map(function (g) {
    var c = g.querySelector('circle');
    var target = { x: parseFloat(c.getAttribute('cx')), y: parseFloat(c.getAttribute('cy')) };
    var best = 0;
    var bestDist = Infinity;
    var steps = 300;
    for (var i = 0; i <= steps; i++) {
      var len = (i / steps) * totalLength;
      var p = path.getPointAtLength(len);
      var d = Math.pow(p.x - target.x, 2) + Math.pow(p.y - target.y, 2);
      if (d < bestDist) { bestDist = d; best = len; }
    }
    return best;
  });

  path.style.strokeDasharray = totalLength;

  function setActive(index) {
    blocks.forEach(function (b) {
      b.classList.toggle('active', parseInt(b.getAttribute('data-index'), 10) === index);
    });
    mapStops.forEach(function (g) {
      var i = parseInt(g.getAttribute('data-index'), 10);
      var c = g.querySelector('circle');
      c.setAttribute('r', i === index ? 9 : 6);
      c.setAttribute('fill', i <= index ? '#f6f1e4' : 'rgba(246,241,228,0.35)');
    });
    path.style.strokeDashoffset = totalLength - stopLengths[index];
    hudKicker.innerHTML = kickers[index];
    hudName.textContent = names[index];
    hudMeta.innerHTML = '<span><b style="color:var(--parchment-2);">' + metas[index][0] + '</b></span><span>' + metas[index][1] + '</span>';
  }

  // Full trail visible on load; scroll updates progress from here
  setActive(0);
  path.style.strokeDashoffset = 0;

  // rootMargin is viewport-relative; trek-block-pad (128px) sets block height for scroll pacing
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        setActive(parseInt(entry.target.getAttribute('data-index'), 10));
      }
    });
  }, { rootMargin: '-38% 0px -38% 0px', threshold: 0 });

  blocks.forEach(function (b) { observer.observe(b); });
})();
