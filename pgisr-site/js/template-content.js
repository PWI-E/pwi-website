/*
 * PGISR HOMEPAGE TEMPLATE CONTENT
 * --------------------------------
 * Replace copy in this file before editing index.html. The limits are design
 * guardrails, not hard truncation rules. Keep verified production claims only.
 */
(function () {
  'use strict';

  var content = {
    hero: {
      description: 'Ground-level persistent ISR. Passive ferrous detection — no power grid, no RF emissions, no visible infrastructure.',
      primaryCta: 'Request a Demonstration',
      secondaryCta: 'About PGI'
    },
    sectorsHeader: {
      eyebrow: 'Where PGI Operates',
      title: 'Built for the hardest environments on earth.'
    },
    sectors: [
      {
        name: 'Border Security & Anti-Poaching',
        description: 'Wide-area surveillance across corridors, crossing points, wildlife reserves, and remote terrain. No infrastructure. No grid. No personnel.'
      },
      {
        name: 'Critical Infrastructure',
        description: 'Unattended multi-sensor networks protecting power generation, pipelines, water treatment, and data centers around the clock.'
      },
      {
        name: 'VIP & Executive Protection',
        description: 'Rapid perimeter deployment for estates, embassies, and mobile protection details. Fully concealed — zero visible infrastructure.'
      },
      {
        name: 'Industrial Security',
        description: 'Layered sensor coverage across plants, refineries, chemical facilities, and mining operations protecting assets and supply chains.'
      },
      {
        name: 'Smart Cities & Transportation',
        description: 'Automated detection at airports, seaports, rail corridors, and urban perimeters — integrated with existing C2 platforms.'
      }
    ],
    finalCta: {
      eyebrow: 'See It In Operation',
      headlineLines: ['Serious security buyers', 'want to see systems operate — not slideshows.'],
      description: 'Schedule a live demonstration and see the full intelligence pipeline in action — from sensor detection through C2 integration.',
      primaryCta: 'Request a Demonstration',
      secondaryCta: 'About PGI'
    },
    simulation: {
      nodeLabels: ['NW-01', 'NORTH-02', 'NE-03', 'EAST-04', 'SE-05', 'GATE-06', 'SW-07', 'WEST-08'],
      disclosure: 'Illustrative demonstration data — not a live operational feed.'
    }
  };

  var limits = {
    heroDescription: 260,
    ctaLabel: 28,
    sectionTitle: 64,
    sectorName: 34,
    sectorDescription: 180,
    finalHeadline: 110
  };

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element && typeof value === 'string') element.textContent = value;
  }

  function setLines(selector, lines) {
    var element = document.querySelector(selector);
    if (!element || !Array.isArray(lines)) return;
    element.textContent = '';
    lines.forEach(function (line, index) {
      if (index) element.appendChild(document.createElement('br'));
      element.appendChild(document.createTextNode(line));
    });
  }

  function warn(label, value, limit) {
    if (typeof value === 'string' && value.length > limit && window.console) {
      console.warn('[PGISR template] ' + label + ' is ' + value.length + ' characters; recommended maximum is ' + limit + '.');
    }
  }

  function applyContent() {
    setText('.hero .subtitle', content.hero.description);
    setText('.hero-actions .button-primary', content.hero.primaryCta);
    setText('.hero-actions .button-secondary', content.hero.secondaryCta);

    setText('.sector-selector .ops-label', content.sectorsHeader.eyebrow);
    document.querySelectorAll('.sector-select-card').forEach(function (card, index) {
      var item = content.sectors[index];
      if (!item) return;
      var name = card.querySelector('.sector-name');
      var description = card.querySelector('.sector-desc');
      if (name) name.textContent = item.name;
      if (description) description.textContent = item.description;
    });

    if (document.querySelector('.cta-band')) {
      setText('.cta-band .ops-label', content.finalCta.eyebrow);
      setLines('.cta-band-headline', content.finalCta.headlineLines);
      setText('.cta-band-sub', content.finalCta.description);
      setText('.cta-band-actions .button-primary', content.finalCta.primaryCta);
      setText('.cta-band-actions .button-secondary', content.finalCta.secondaryCta);
    }

    var feedPanel = document.querySelector('.intel-feed-panel');
    if (feedPanel && !feedPanel.querySelector('.template-data-disclosure')) {
      var disclosure = document.createElement('p');
      disclosure.className = 'template-data-disclosure';
      disclosure.textContent = content.simulation.disclosure;
      feedPanel.appendChild(disclosure);
    }

    warn('Hero description', content.hero.description, limits.heroDescription);
    warn('Hero primary CTA', content.hero.primaryCta, limits.ctaLabel);
    warn('Sectors title', content.sectorsHeader.title, limits.sectionTitle);
    content.sectors.forEach(function (item, index) {
      warn('Sector ' + (index + 1) + ' name', item.name, limits.sectorName);
      warn('Sector ' + (index + 1) + ' description', item.description, limits.sectorDescription);
    });
    warn('Final headline', content.finalCta.headlineLines.join(' '), limits.finalHeadline);
  }

  window.PGISR_TEMPLATE = {
    content: content,
    limits: limits
  };

  applyContent();
}());
