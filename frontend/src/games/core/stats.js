import Stats from 'three/addons/libs/stats.module.js';

export function initFPSstats(container) {
    const stats = new Stats();

    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '80px';
    stats.dom.style.left = '20px';
    stats.dom.style.zIndex = '10';

    if (container) {
        container.appendChild(stats.dom);
    }

    return stats;
}

export function cleanupFPSstats(stats, container) {
    if (stats && stats.dom && container && container.contains(stats.dom)) {
        container.removeChild(stats.dom);
    }
}