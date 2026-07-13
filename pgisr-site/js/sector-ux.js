/**
 * Interactive sector selector, sticky progress, pipeline stages,
 * feed drawers, and subtle hero parallax.
 */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var INFRA_NODES = {
    'nw-01': {
      label: 'NW — 01', name: 'Northwest Perimeter',
      loc: 'Outer perimeter · NW sector',
      tags: ['Magnetometer LR'],
      xy: [44, 44], spark: [1, 0, 2, 1, 0, 0, 1, 2, 0, 0, 0, 0],
      battery: '91%', range: 'LR', lastEvent: '2h 14m ago', events24h: '7',
      desc: 'Long-range anchor for the northwest sector. Passive magnetic detection senses ferrous signatures — vehicles, weapons, carried equipment — through vegetation and in zero-light conditions, well before contact with the fence line.'
    },
    'north-02': {
      label: 'NORTH — 02', name: 'North Perimeter',
      loc: 'Outer fence · north sector',
      tags: ['Magnetometer SR'],
      xy: [450, 44], spark: [2, 1, 3, 0, 2, 1, 2, 3, 1, 2, 1, 1],
      battery: '78%', range: 'SR', lastEvent: '41m ago', events24h: '19',
      desc: 'North boundary coverage. Fully passive ferrous detection senses approaching vehicles and carried equipment before they reach the fence line.'
    },
    'ne-03': {
      label: 'NE — 03', name: 'Northeast Perimeter',
      loc: 'Outer perimeter · NE sector',
      tags: ['Magnetometer LR'],
      xy: [856, 44], spark: [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      battery: '94%', range: 'LR', lastEvent: '5h 02m ago', events24h: '3',
      desc: 'Single long-range magnetometer anchoring the northeast sector. Extended detection radius covers both the north and east fence runs from one node.'
    },
    'east-04': {
      label: 'EAST — 04', name: 'East Perimeter — Vehicle Zone',
      loc: 'East fence · vehicle staging area',
      tags: ['Magnetometer SR', 'PTZ Integration'],
      xy: [856, 260], spark: [3, 2, 4, 3, 1, 2, 4, 5, 3, 2, 3, 2],
      battery: '85%', range: 'SR', lastEvent: '18m ago', events24h: '34',
      desc: 'Monitors the eastern boundary of the vehicle staging area. On detection, the node triggers existing PTZ cameras through C2 integration.'
    },
    'se-05': {
      label: 'SE — 05', name: 'Southeast Perimeter',
      loc: 'Outer perimeter · SE sector',
      tags: ['Magnetometer LR'],
      xy: [856, 476], spark: [1, 2, 0, 1, 2, 1, 0, 1, 1, 0, 2, 0],
      battery: '67%', range: 'LR', lastEvent: '1h 33m ago', events24h: '11',
      desc: 'Southeast sector anchor with extended detection radius. Derives direction of travel and approach speed from magnetic signatures along the eastern corridor.'
    },
    'gate-06': {
      label: 'GATE — 06', name: 'Primary Access Control Point',
      loc: 'South perimeter · controlled entry',
      tags: ['Magnetometer SR', 'PTZ Integration'],
      xy: [450, 476], spark: [5, 4, 6, 3, 5, 7, 4, 6, 8, 5, 4, 5],
      battery: '88%', range: 'SR', lastEvent: '4m ago', events24h: '62',
      desc: 'Primary detection point for all vehicles transiting the controlled access point. Captures ferrous mass signature, direction, and approach speed on every event.'
    },
    'sw-07': {
      label: 'SW — 07', name: 'Southwest Perimeter',
      loc: 'Outer perimeter · SW sector',
      tags: ['Magnetometer LR'],
      xy: [44, 476], spark: [0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0],
      battery: '72%', range: 'LR', lastEvent: '3h 47m ago', events24h: '5',
      desc: 'Long-range corner node with overlapping coverage to adjacent south and west sector nodes.'
    },
    'west-08': {
      label: 'WEST — 08', name: 'Secondary Access Point',
      loc: 'West fence · secondary entry',
      tags: ['Magnetometer SR'],
      xy: [44, 260], spark: [1, 0, 2, 1, 1, 0, 1, 2, 1, 0, 1, 1],
      battery: '59%', range: 'SR', lastEvent: '22m ago', events24h: '8',
      desc: 'Secondary controlled access point. Ferrous-mass profiling distinguishes passenger cars, trucks, and heavy equipment on every transit.'
    }
  };

  function cloneNodes(base, overlays) {
    var out = {};
    Object.keys(base).forEach(function (id) {
      out[id] = Object.assign({}, base[id], overlays[id] || {});
    });
    return out;
  }

  var SECTORS = [
    {
      id: 'border',
      num: '01',
      name: 'Border Security & Anti-Poaching',
      shortName: 'Border Security',
      scene: 'scene-border',
      headline: 'Wide-area corridor coverage.',
      copy: 'Unattended nodes along remote borders and wildlife corridors — no grid, no RF emissions, no visible infrastructure.',
      caption: 'ILLUSTRATIVE DEPLOYMENT · BORDER CORRIDOR',
      capabilities: [
        'Long-range magnetometer spacing across open terrain',
        'Zero-power-grid / zero-emission edge nodes',
        'Mesh uplink through sparse coverage zones',
        'C2 handoff for patrol & response teams'
      ],
      nodeLabels: ['COR-01', 'COR-02', 'COR-03', 'COR-04', 'COR-05', 'XING-06', 'COR-07', 'COR-08'],
      sim: { targetId: 'gate-06', sx: 560, sy: 560, ex: 450, ey: 476, covR: 70 },
      nodes: cloneNodes(INFRA_NODES, {
        'nw-01': { label: 'COR — 01', name: 'North Corridor Anchor', loc: 'Border corridor · north run' },
        'north-02': { label: 'COR — 02', name: 'Corridor Midpoint', loc: 'Border corridor · center' },
        'ne-03': { label: 'COR — 03', name: 'Northeast Crossing Watch', loc: 'Remote terrain · NE approach' },
        'east-04': { label: 'COR — 04', name: 'East Terrain Node', loc: 'Open terrain · east flank' },
        'se-05': { label: 'COR — 05', name: 'Southeast Corridor', loc: 'Wildlife reserve edge · SE' },
        'gate-06': { label: 'XING — 06', name: 'Primary Crossing Point', loc: 'Known crossing · south approach' },
        'sw-07': { label: 'COR — 07', name: 'Southwest Trail', loc: 'Trail network · SW' },
        'west-08': { label: 'COR — 08', name: 'West Flank Node', loc: 'Remote terrain · west' }
      })
    },
    {
      id: 'infrastructure',
      num: '02',
      name: 'Critical Infrastructure',
      shortName: 'Infrastructure',
      scene: 'scene-infrastructure',
      headline: 'Nothing crosses without notice.',
      copy: 'Unattended multi-sensor networks protecting power generation, pipelines, water treatment, and data centers around the clock.',
      caption: 'ILLUSTRATIVE DEPLOYMENT · CRITICAL INFRASTRUCTURE SITE',
      capabilities: [
        'Perimeter fence + vehicle-zone coverage',
        'PTZ camera cueing on detection events',
        'Gateway hub at the operations center',
        'Open-architecture C2 delivery'
      ],
      nodeLabels: ['NW-01', 'NORTH-02', 'NE-03', 'EAST-04', 'SE-05', 'GATE-06', 'SW-07', 'WEST-08'],
      sim: { targetId: 'gate-06', sx: 560, sy: 600, ex: 450, ey: 476, covR: 70 },
      nodes: INFRA_NODES
    },
    {
      id: 'vip',
      num: '03',
      name: 'VIP & Executive Protection',
      shortName: 'VIP Protection',
      scene: 'scene-vip',
      headline: 'Concealed estate perimeter.',
      copy: 'Rapid perimeter deployment for estates, embassies, and mobile protection details — fully concealed, zero visible infrastructure.',
      caption: 'ILLUSTRATIVE DEPLOYMENT · ESTATE PERIMETER',
      capabilities: [
        'Covert node placement along estate fence lines',
        'Quiet mesh with low visual signature',
        'Fast temporary / event deployment kits',
        'Direct feed to protective detail C2'
      ],
      nodeLabels: ['N-01', 'N-02', 'N-03', 'E-04', 'S-05', 'GATE-06', 'W-07', 'W-08'],
      sim: { targetId: 'gate-06', sx: 520, sy: 560, ex: 450, ey: 476, covR: 70 },
      nodes: cloneNodes(INFRA_NODES, {
        'nw-01': { label: 'N — 01', name: 'North Garden Line', loc: 'Estate perimeter · north' },
        'north-02': { label: 'N — 02', name: 'Main Drive Approach', loc: 'Primary approach · north' },
        'ne-03': { label: 'N — 03', name: 'Northeast Hedge Line', loc: 'Concealed hedge · NE' },
        'east-04': { label: 'E — 04', name: 'East Boundary', loc: 'Estate fence · east' },
        'se-05': { label: 'S — 05', name: 'Southeast Corner', loc: 'Estate corner · SE' },
        'gate-06': { label: 'GATE — 06', name: 'Main Gate', loc: 'Controlled entry · south' },
        'sw-07': { label: 'W — 07', name: 'Southwest Corner', loc: 'Estate corner · SW' },
        'west-08': { label: 'W — 08', name: 'Service Entrance', loc: 'Secondary entry · west' }
      })
    },
    {
      id: 'industrial',
      num: '04',
      name: 'Industrial Security',
      shortName: 'Industrial',
      scene: 'scene-industrial',
      headline: 'Plant and supply-chain coverage.',
      copy: 'Layered sensor coverage across plants, refineries, chemical facilities, and mining operations protecting assets and supply chains.',
      caption: 'ILLUSTRATIVE DEPLOYMENT · INDUSTRIAL FACILITY',
      capabilities: [
        'Tank farm & process-area perimeter nodes',
        'Vehicle / rail corridor detection',
        'Hazard-zone edge classification',
        'Integration with plant security C2'
      ],
      nodeLabels: ['NW-01', 'N-02', 'NE-03', 'E-04', 'SE-05', 'GATE-06', 'SW-07', 'W-08'],
      sim: { targetId: 'gate-06', sx: 580, sy: 580, ex: 450, ey: 476, covR: 70 },
      nodes: cloneNodes(INFRA_NODES, {
        'nw-01': { label: 'NW — 01', name: 'Tank Farm NW', loc: 'Process area · NW' },
        'north-02': { label: 'N — 02', name: 'North Process Line', loc: 'Plant fence · north' },
        'ne-03': { label: 'NE — 03', name: 'Rail Spur Watch', loc: 'Rail corridor · NE' },
        'east-04': { label: 'E — 04', name: 'East Loading Dock', loc: 'Loading zone · east' },
        'se-05': { label: 'SE — 05', name: 'Southeast Yard', loc: 'Yard perimeter · SE' },
        'gate-06': { label: 'GATE — 06', name: 'Main Plant Gate', loc: 'Controlled entry · south' },
        'sw-07': { label: 'SW — 07', name: 'Southwest Utilities', loc: 'Utility corridor · SW' },
        'west-08': { label: 'W — 08', name: 'West Service Gate', loc: 'Service entry · west' }
      })
    },
    {
      id: 'transit',
      num: '05',
      name: 'Smart Cities & Transportation',
      shortName: 'Transportation',
      scene: 'scene-transit',
      headline: 'Ports, rails, and urban edges.',
      copy: 'Automated detection at airports, seaports, rail corridors, and urban perimeters — integrated with existing C2 platforms.',
      caption: 'ILLUSTRATIVE DEPLOYMENT · TRANSPORT CORRIDOR',
      capabilities: [
        'Corridor and choke-point node layouts',
        'Airport / seaport perimeter coverage',
        'Rail approach early warning',
        'City C2 and existing security stack hooks'
      ],
      nodeLabels: ['N-01', 'N-02', 'N-03', 'E-04', 'S-05', 'GATE-06', 'W-07', 'W-08'],
      sim: { targetId: 'gate-06', sx: 540, sy: 590, ex: 450, ey: 476, covR: 70 },
      nodes: cloneNodes(INFRA_NODES, {
        'nw-01': { label: 'N — 01', name: 'North Runway Edge', loc: 'Airside perimeter · NW' },
        'north-02': { label: 'N — 02', name: 'Approach Corridor', loc: 'Transport corridor · north' },
        'ne-03': { label: 'N — 03', name: 'Northeast Fence', loc: 'Facility fence · NE' },
        'east-04': { label: 'E — 04', name: 'East Cargo Zone', loc: 'Cargo apron · east' },
        'se-05': { label: 'S — 05', name: 'Southeast Rail Link', loc: 'Rail spur · SE' },
        'gate-06': { label: 'GATE — 06', name: 'Primary Access Gate', loc: 'Controlled entry · south' },
        'sw-07': { label: 'W — 07', name: 'Southwest Port Edge', loc: 'Port perimeter · SW' },
        'west-08': { label: 'W — 08', name: 'West Service Road', loc: 'Service road · west' }
      })
    }
  ];

  var activeSectorId = 'infrastructure';
  var feedNodeLabels = SECTORS[1].nodeLabels.slice();

  function getSector(id) {
    for (var i = 0; i < SECTORS.length; i++) {
      if (SECTORS[i].id === id) return SECTORS[i];
    }
    return SECTORS[1];
  }

  function setActiveSector(id, opts) {
    opts = opts || {};
    var sector = getSector(id);
    if (!sector) return;
    activeSectorId = sector.id;

    document.querySelectorAll('.scenario-scene').forEach(function (el) {
      var on = el.id === sector.scene;
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
    });

    document.querySelectorAll('.sector-select-card').forEach(function (card) {
      var selected = card.getAttribute('data-sector') === sector.id;
      card.classList.toggle('is-selected', selected);
      card.setAttribute('aria-selected', selected ? 'true' : 'false');
      card.tabIndex = selected ? 0 : -1;
    });

    var title = document.getElementById('sector-live-title');
    var copy = document.getElementById('sector-live-copy');
    var caps = document.getElementById('sector-capabilities');
    var layer = document.getElementById('capability-layer-label');
    if (title) title.textContent = sector.headline;
    if (copy) copy.textContent = sector.copy;
    if (caps) {
      caps.innerHTML = sector.capabilities.map(function (c) {
        return '<li>' + c + '</li>';
      }).join('');
    }
    if (layer) {
      layer.classList.remove('is-swapping');
      void layer.offsetWidth;
      layer.textContent = sector.shortName.toUpperCase();
      if (!reduced) layer.classList.add('is-swapping');
    }

    var mapCaption = document.getElementById('map-scenario-caption');
    if (mapCaption) mapCaption.textContent = sector.caption;

    feedNodeLabels = sector.nodeLabels.slice();
    window.PGISR_FEED_NODES = feedNodeLabels;

    if (window.PGISR_DIAGRAM && typeof window.PGISR_DIAGRAM.applySector === 'function') {
      window.PGISR_DIAGRAM.applySector(sector);
    }

    if (opts.scrollCard) {
      var selectedCard = document.querySelector('.sector-select-card[data-sector="' + sector.id + '"]');
      if (selectedCard && selectedCard.scrollIntoView) {
        selectedCard.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      }
    }
  }

  function initSectorSelector() {
    var track = document.getElementById('sector-select-track');
    if (!track) return;

    track.addEventListener('click', function (e) {
      var card = e.target.closest('.sector-select-card');
      if (!card) return;
      setActiveSector(card.getAttribute('data-sector'), { scrollCard: true });
    });

    track.addEventListener('keydown', function (e) {
      var cards = Array.prototype.slice.call(track.querySelectorAll('.sector-select-card'));
      var idx = cards.findIndex(function (c) { return c.classList.contains('is-selected'); });
      if (idx < 0) idx = 0;
      var next = idx;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(cards.length - 1, idx + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, idx - 1);
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = cards.length - 1;
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setActiveSector(cards[idx].getAttribute('data-sector'));
        return;
      } else return;
      e.preventDefault();
      setActiveSector(cards[next].getAttribute('data-sector'), { scrollCard: true });
      cards[next].focus();
    });

    /* Mobile uses a vertical stack — no snap carousel selection */

    setActiveSector(activeSectorId);
  }

  function initProgressRail() {
    var rail = document.getElementById('page-progress');
    if (!rail) return;
    var links = Array.prototype.slice.call(rail.querySelectorAll('[data-progress-section]'));
    var sections = links.map(function (link) {
      return document.getElementById(link.getAttribute('data-progress-section'));
    }).filter(Boolean);

    function setActive(id) {
      links.forEach(function (link) {
        var on = link.getAttribute('data-progress-section') === id;
        link.classList.toggle('is-active', on);
        if (on) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }

    if ('IntersectionObserver' in window) {
      var ratios = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          ratios[entry.target.id] = entry.intersectionRatio;
        });
        var bestId = null;
        var best = 0;
        sections.forEach(function (sec) {
          var r = ratios[sec.id] || 0;
          if (r > best) { best = r; bestId = sec.id; }
        });
        if (bestId) setActive(bestId);
      }, { threshold: [0.15, 0.35, 0.55, 0.75], rootMargin: '-12% 0px -45% 0px' });
      sections.forEach(function (sec) { io.observe(sec); });
    }

    rail.classList.add('is-ready');
  }

  function initPipelineStages() {
    var steps = document.querySelectorAll('.pipeline-step');
    var wrap = document.querySelector('.pipeline-steps');
    if (!wrap || !steps.length) return;
    wrap.setAttribute('data-reveal-pipeline', '');

    if (reduced) {
      steps.forEach(function (s) { s.classList.add('is-active'); });
      wrap.classList.add('pipeline-go');
      return;
    }

    if (!('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        wrap.classList.add('pipeline-go');
        steps.forEach(function (step, i) {
          setTimeout(function () {
            step.classList.add('is-active');
          }, i * 180);
        });
        io.disconnect();
      });
    }, { threshold: 0.25 });
    io.observe(wrap);
  }

  function initFeedDrawer() {
    var feed = document.getElementById('detection-feed');
    var drawer = document.getElementById('feed-detail-drawer');
    if (!feed || !drawer) return;

    var elTime = document.getElementById('feed-drawer-time');
    var elNode = document.getElementById('feed-drawer-node');
    var elType = document.getElementById('feed-drawer-type');
    var elConf = document.getElementById('feed-drawer-conf');
    var elStatus = document.getElementById('feed-drawer-status');
    var elDesc = document.getElementById('feed-drawer-desc');
    var closeBtn = document.getElementById('feed-drawer-close');

    var DESCS = {
      'VEHICLE DETECTED': 'Ferrous mass consistent with a vehicle signature. Edge classification completed on-node before uplink.',
      'VEHICLE TRANSIT': 'Authorized or routine transit profile. Event logged and cleared for operator review.',
      'PERSONNEL': 'Smaller ferrous signature consistent with carried equipment or personnel movement near the node.',
      'FERROUS SIG': 'Unclassified ferrous anomaly. Confidence below vehicle threshold — queued for operator attention.',
      'UNKNOWN MASS': 'Ambiguous mass signature. Elevated for secondary confirmation via C2 / PTZ cueing.'
    };

    function openDrawer(row) {
      var time = row.querySelector('.feed-time');
      var node = row.querySelector('.feed-node');
      var type = row.querySelector('.feed-type');
      var conf = row.querySelector('.feed-conf');
      var status = row.querySelector('.feed-status');
      var typeText = type ? type.textContent : '';
      if (elTime) elTime.textContent = time ? time.textContent : '—';
      if (elNode) elNode.textContent = node ? node.textContent : '—';
      if (elType) elType.textContent = typeText || '—';
      if (elConf) elConf.textContent = conf ? conf.textContent : '—';
      if (elStatus) elStatus.textContent = status ? status.textContent : '—';
      if (elDesc) elDesc.textContent = DESCS[typeText] || 'Illustrative detection event from the active deployment scenario.';
      drawer.hidden = false;
      drawer.classList.add('is-open');
      feed.querySelectorAll('.feed-row.is-selected').forEach(function (r) { r.classList.remove('is-selected'); });
      row.classList.add('is-selected');
      row.setAttribute('aria-expanded', 'true');
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      drawer.hidden = true;
      feed.querySelectorAll('.feed-row.is-selected').forEach(function (r) {
        r.classList.remove('is-selected');
        r.setAttribute('aria-expanded', 'false');
      });
    }

    feed.addEventListener('click', function (e) {
      var row = e.target.closest('.feed-row');
      if (!row) return;
      if (row.classList.contains('is-selected')) closeDrawer();
      else openDrawer(row);
    });

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  }

  function initHeroParallax() {
    if (reduced) return;
    var hero = document.querySelector('.hero');
    var grid = document.querySelector('.hero-dot-grid');
    if (!hero || !grid || !window.matchMedia('(pointer: fine)').matches) return;

    var raf = null;
    var tx = 0;
    var ty = 0;

    hero.addEventListener('pointermove', function (e) {
      var rect = hero.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * 18;
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * 12;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        grid.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0)';
        raf = null;
      });
    });

    hero.addEventListener('pointerleave', function () {
      grid.style.transform = 'translate3d(0,0,0)';
    });
  }

  window.PGISR_SECTORS = SECTORS;
  window.PGISR_FEED_NODES = feedNodeLabels;
  window.PGISR_setSector = setActiveSector;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initSectorSelector();
      initProgressRail();
      initPipelineStages();
      initFeedDrawer();
      initHeroParallax();
    });
  } else {
    initSectorSelector();
    initProgressRail();
    initPipelineStages();
    initFeedDrawer();
    initHeroParallax();
  }
}());
