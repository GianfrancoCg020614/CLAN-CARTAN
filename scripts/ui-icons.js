(() => {
  'use strict';

  const paths = {
    home: 'm3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9',
    menu: 'M4 6h16M4 12h16M4 18h16',
    back: 'M19 12H5m7-7-7 7 7 7',
    close: 'm6 6 12 12M18 6 6 18',
    search: 'M21 21l-4.5-4.5M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
    refresh: 'M20 8V3m0 5h-5m5 0a8 8 0 1 0 .3 7',
    profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m12-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m11-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm5-4a4 4 0 0 1 0 8m4 9v-2a4 4 0 0 0-4-4',
    wallet: 'M20 8H5a2 2 0 0 1 0-4h12l3 4v11a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6m17 6h-5a2 2 0 0 0 0 4h5m-5-2h.01',
    gift: 'M3 8h18v4H3zm2 4v9h14v-9M12 8v13m0-13H7.5A2.5 2.5 0 1 1 10 5.5Zm0 0h4.5A2.5 2.5 0 1 0 14 5.5Z',
    store: 'M3 9h18l-2-5H5Zm0 0v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9M5 14v7h14v-7m-9 7v-5h4v5',
    bag: 'M5 8h14l2 13H3L5 8Zm4 2V6a3 3 0 0 1 6 0v4',
    box: 'm3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4m-9 4v10M7.5 5 17 9.5',
    key: 'M14 10a5 5 0 1 1 5 5h-2v3h-3v3h-4v-4l4.6-4.6A5 5 0 0 1 14 10Zm5 0h.01',
    grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
    chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.5-4A8.5 8.5 0 1 1 21 11.5ZM8 10h8m-8 4h5',
    help: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM9.1 9a3 3 0 1 1 5 2.2c-1.2 1-2.1 1.4-2.1 2.8m0 3h.01',
    sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
    moon: 'M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z',
    bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12a2 2 0 0 0 4 0',
    building: 'M4 21V3h12v18M16 9h4v12M2 21h20M7 7h2m2 0h2M7 11h2m2 0h2m-6 4h2m2 0h2m-4 6v-3h2v3',
    document: 'M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h6',
    report: 'M3 3v18h18M8 17v-5m5 5V8m5 9V5',
    pay: 'M3 5h18v14H3Zm0 5h18M6 15h4',
    plus: 'M12 5v14M5 12h14',
    check: 'm5 12 4 4L19 6',
    shield: 'm12 2 8 4v5c0 5-4 8-8 11-4-3-8-6-8-11V6Zm-4 9 3 3 5-5',
    mail: 'M3 5h18v14H3Zm0 1 9 7 9-7',
    list: 'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
    history: 'M3 12a9 9 0 1 1 2.6 6.4M3 6v6h6m3-5v5l3 2',
    recharge: 'M12 2v13m-5-5 5 5 5-5M4 16v5h16v-5',
    upload: 'M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5',
    send: 'm3 3 18 9-18 9 4-9-4-9Zm4 9h14',
    clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 2',
    spark: 'M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z',
    screen: 'M3 4h18v13H3Zm5 17h8m-4-4v4m-2-13 5 3-5 3Z',
  };

  function svg(name) {
    if (!Object.hasOwn(paths, name)) return '';
    return `<svg class="cc-ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[name]}"></path></svg>`;
  }

  function node(name) {
    const template = document.createElement('template');
    template.innerHTML = svg(name);
    return template.content.firstElementChild;
  }

  window.CCIcons = Object.freeze({ svg, node });
})();
