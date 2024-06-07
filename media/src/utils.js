/* jshint esversion: 6 */

import * as THREE from 'three';
import { evaluate_cmap } from './js-colormaps';

/**
 * Given a URL base and a path, return the two combined.
 *
 * This should work with both local, relative paths and absolute URIs.
 */
const joinUrl = function (base, path) {
    let url = {};

    // Add a slash at the end of base if it's not present.
    if (base.charAt(base.length - 1) !== '/') {
        base = base + '/';
    }

    try {
        url = new URL(path, base);
    } catch (e) {
        url = new URL(
            base.substring(1) +
            path.substring(1),
            window.location.origin);
    }

    return url.href;
};

/**
 * Converts parameters and objects into URL Search Parameters
 * @param {*} params 
 * @param {*} objects 
 * @returns URLSearchParams
 */
const convertToURLParams = function (params, objects) {
    objects.forEach((object, index) => {
        const prefix = `obj${index}_`;
        params[prefix + "kind"] = object.kind;
        params[prefix + "color"] = object.color;
        if (object.animation) {
            params[prefix + "animation"] = object.animation;
        }
        if (object.params) {
            for (const [key, value] of Object.entries(object.params)) {
                params[prefix + "params_" + key] = value;
            }
        }
    });
    const urlParams = new URLSearchParams(params);
    return urlParams;
};

/**
 * Try to (base64) unencode search string and pass it along untouched otherwise. 
 * 
 * @param {string} search - input likely from window.location.search
 * @returns {string} URLSearchParameter-type string
 */
function processSearchEncoding(search) {
    console.log(`Search string is ${search.length} char long.`);
    try {
        return atob(search.slice(1)); // take off '?'
    } catch (e) {
        console.log("(possibly) old URL encoding\n", e);
        return search;
    }
}

/**
 * Given a room/session id, return its path.
 */
const getRoomUrl = function (id) {
    return joinUrl(window.location.origin, `/rooms/${id}/`);
};

export function marchingSquares({
    f,
    level,
    xmin,
    xmax,
    ymin,
    ymax,
    zLevel = null,
    nX = 30,
    nY = 30,
}) {
    const dx = (xmax - xmin) / nX,
        dy = (ymax - ymin) / nY;
    const z = zLevel === null ? level : zLevel;
    let points = [];
    // for (let i=0; i < nX; i++) {
    //   for (let j=0; j < nY; j++) {
    //       const x = xmin + i*dx, y = ymin + j*dy;
    for (let x = xmin; x < xmax - dx / 3; x += dx) {
        for (let y = ymin; y < ymax - dy / 3; y += dy) {
            const [a, b, c, d, e] = [
                f(x, y),
                f(x + dx, y),
                f(x + dx, y + dy),
                f(x, y + dy),
                f(x + dx / 2, y + dy / 2),
            ];
            marchingSquare(a, b, c, d, e, level).forEach((element) => {
                const [s, t] = element;
                points.push(new THREE.Vector3(x + s * dx, y + t * dy, z));
            });
            // for (let xy of [[x,y],[x+dx,y],[x + dx,y + dy],[x,y + dy]]) {
            //     corners.push((f(...xy) > level) ? 1 : 0);
            // }
        }
    }
    return points;
}

// binary value for val >= lev for a,b,c,d, starting from most significant bit (perhaps stupidly)
const squaresTable = {
    0b0000: [],
    0b1111: [],
    0b0111: [0, 3],
    0b1011: [0, 1],
    0b1101: [1, 2],
    0b1110: [2, 3],
    0b1000: [0, 3],
    0b0100: [0, 1],
    0b0010: [1, 2],
    0b0001: [2, 3],
    0b1100: [1, 3],
    0b0110: [0, 2],
    0b0011: [1, 3],
    0b1001: [0, 2],
    // "0101": [], // saddle point
    // "1010": []
};

const msPositions = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
],
    msDirections = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
    ];

// return line segments ([pairs of triples])
function marchingSquare(a, b, c, d, e, lev) {
    /*
      a,b,c,d values on corner of unit square {0,1}x{0,1} counter-clockwise from origin
      e is center value for resolving saddle points
      return line segment endpoints pairwise in normalized coordinates
    */

    const values = [a, b, c, d];

    let code = 0;

    const cs = [null, null, null, null];

    for (let index = 0; index < values.length; index++) {
        const m = values[index],
            M = values[(index + 1) % 4];

        if (m >= lev) {
            code += Math.pow(2, 3 - index);
        }

        if ((m < lev && M >= lev) || (m >= lev && M < lev)) {
            cs[index] = (lev - m) / (M - m);
        }
    }

    const endPoints = [];
    let edges = [];

    if (code in squaresTable) {
        edges = squaresTable[code];
    } else {
        if ((a < lev && e < lev) || (!(a < lev) && !(e < lev))) {
            edges = [0, 1, 2, 3];
        } else {
            edges = [3, 0, 1, 2];
        }
    }

    for (let index = 0; index < edges.length; index++) {
        const i = edges[index];
        const [p1, p2] = msPositions[i];
        const [v1, v2] = msDirections[i];
        const c = cs[i];

        endPoints.push([p1 + c * v1, p2 + c * v2]);
    }
    return endPoints;
}

const edgeTable = new Uint16Array([
    0x0, 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c, 0x80c, 0x905, 0xa0f,
    0xb06, 0xc0a, 0xd03, 0xe09, 0xf00, 0x190, 0x99, 0x393, 0x29a, 0x596, 0x49f,
    0x795, 0x69c, 0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90, 0x230,
    0x339, 0x33, 0x13a, 0x636, 0x73f, 0x435, 0x53c, 0xa3c, 0xb35, 0x83f, 0x936,
    0xe3a, 0xf33, 0xc39, 0xd30, 0x3a0, 0x2a9, 0x1a3, 0xaa, 0x7a6, 0x6af, 0x5a5,
    0x4ac, 0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0, 0x460, 0x569,
    0x663, 0x76a, 0x66, 0x16f, 0x265, 0x36c, 0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a,
    0x963, 0xa69, 0xb60, 0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff, 0x3f5, 0x2fc,
    0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0, 0x650, 0x759, 0x453,
    0x55a, 0x256, 0x35f, 0x55, 0x15c, 0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53,
    0x859, 0x950, 0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc, 0xfcc,
    0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0, 0x8c0, 0x9c9, 0xac3, 0xbca,
    0xcc6, 0xdcf, 0xec5, 0xfcc, 0xcc, 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9,
    0x7c0, 0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c, 0x15c, 0x55,
    0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650, 0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6,
    0xfff, 0xcf5, 0xdfc, 0x2fc, 0x3f5, 0xff, 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
    0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c, 0x36c, 0x265, 0x16f,
    0x66, 0x76a, 0x663, 0x569, 0x460, 0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af,
    0xaa5, 0xbac, 0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa, 0x1a3, 0x2a9, 0x3a0, 0xd30,
    0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c, 0x53c, 0x435, 0x73f, 0x636,
    0x13a, 0x33, 0x339, 0x230, 0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895,
    0x99c, 0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99, 0x190, 0xf00, 0xe09,
    0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c, 0x70c, 0x605, 0x50f, 0x406, 0x30a,
    0x203, 0x109, 0x0,
]);

const triTable = [
    [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 1, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 8, 3, 9, 8, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 2, 10, 0, 2, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [2, 8, 3, 2, 10, 8, 10, 9, 8, -1, -1, -1, -1, -1, -1, -1],
    [3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 11, 2, 8, 11, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 9, 0, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 11, 2, 1, 9, 11, 9, 8, 11, -1, -1, -1, -1, -1, -1, -1],
    [3, 10, 1, 11, 10, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 10, 1, 0, 8, 10, 8, 11, 10, -1, -1, -1, -1, -1, -1, -1],
    [3, 9, 0, 3, 11, 9, 11, 10, 9, -1, -1, -1, -1, -1, -1, -1],
    [9, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 3, 0, 7, 3, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 1, 9, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 1, 9, 4, 7, 1, 7, 3, 1, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, 4, 7, 3, 0, 4, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1],
    [9, 2, 10, 9, 0, 2, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
    [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1, -1, -1, -1],
    [8, 4, 7, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [11, 4, 7, 11, 2, 4, 2, 0, 4, -1, -1, -1, -1, -1, -1, -1],
    [9, 0, 1, 8, 4, 7, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
    [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1, -1, -1, -1],
    [3, 10, 1, 3, 11, 10, 7, 8, 4, -1, -1, -1, -1, -1, -1, -1],
    [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1, -1, -1, -1],
    [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1, -1, -1, -1],
    [4, 7, 11, 4, 11, 9, 9, 11, 10, -1, -1, -1, -1, -1, -1, -1],
    [9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 5, 4, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 5, 4, 1, 5, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [8, 5, 4, 8, 3, 5, 3, 1, 5, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, 0, 8, 1, 2, 10, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
    [5, 2, 10, 5, 4, 2, 4, 0, 2, -1, -1, -1, -1, -1, -1, -1],
    [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1, -1, -1, -1],
    [9, 5, 4, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 11, 2, 0, 8, 11, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
    [0, 5, 4, 0, 1, 5, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
    [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1, -1, -1, -1],
    [10, 3, 11, 10, 1, 3, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1],
    [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1, -1, -1, -1],
    [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1, -1, -1, -1],
    [5, 4, 8, 5, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1],
    [9, 7, 8, 5, 7, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 3, 0, 9, 5, 3, 5, 7, 3, -1, -1, -1, -1, -1, -1, -1],
    [0, 7, 8, 0, 1, 7, 1, 5, 7, -1, -1, -1, -1, -1, -1, -1],
    [1, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 7, 8, 9, 5, 7, 10, 1, 2, -1, -1, -1, -1, -1, -1, -1],
    [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1, -1, -1, -1],
    [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1, -1, -1, -1],
    [2, 10, 5, 2, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1],
    [7, 9, 5, 7, 8, 9, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1],
    [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1, -1, -1, -1],
    [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1, -1, -1, -1],
    [11, 2, 1, 11, 1, 7, 7, 1, 5, -1, -1, -1, -1, -1, -1, -1],
    [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1, -1, -1, -1],
    [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],
    [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],
    [11, 10, 5, 7, 11, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 0, 1, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 8, 3, 1, 9, 8, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
    [1, 6, 5, 2, 6, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 6, 5, 1, 2, 6, 3, 0, 8, -1, -1, -1, -1, -1, -1, -1],
    [9, 6, 5, 9, 0, 6, 0, 2, 6, -1, -1, -1, -1, -1, -1, -1],
    [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1, -1, -1, -1],
    [2, 3, 11, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [11, 0, 8, 11, 2, 0, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
    [0, 1, 9, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
    [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1, -1, -1, -1],
    [6, 3, 11, 6, 5, 3, 5, 1, 3, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1, -1, -1, -1],
    [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1, -1, -1, -1],
    [6, 5, 9, 6, 9, 11, 11, 9, 8, -1, -1, -1, -1, -1, -1, -1],
    [5, 10, 6, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 3, 0, 4, 7, 3, 6, 5, 10, -1, -1, -1, -1, -1, -1, -1],
    [1, 9, 0, 5, 10, 6, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
    [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1, -1, -1, -1],
    [6, 1, 2, 6, 5, 1, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1, -1, -1, -1],
    [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1, -1, -1, -1],
    [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],
    [3, 11, 2, 7, 8, 4, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
    [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, -1, -1, -1, -1],
    [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1],
    [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, -1],
    [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, -1, -1, -1, -1],
    [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, -1],
    [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, -1],
    [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1, -1, -1, -1],
    [10, 4, 9, 6, 4, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 10, 6, 4, 9, 10, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1],
    [10, 0, 1, 10, 6, 0, 6, 4, 0, -1, -1, -1, -1, -1, -1, -1],
    [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1, -1, -1, -1],
    [1, 4, 9, 1, 2, 4, 2, 6, 4, -1, -1, -1, -1, -1, -1, -1],
    [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1, -1, -1, -1],
    [0, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [8, 3, 2, 8, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1],
    [10, 4, 9, 10, 6, 4, 11, 2, 3, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1, -1, -1, -1],
    [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1, -1, -1, -1],
    [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],
    [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1, -1, -1, -1],
    [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],
    [3, 11, 6, 3, 6, 0, 0, 6, 4, -1, -1, -1, -1, -1, -1, -1],
    [6, 4, 8, 11, 6, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [7, 10, 6, 7, 8, 10, 8, 9, 10, -1, -1, -1, -1, -1, -1, -1],
    [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1, -1, -1, -1],
    [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1, -1, -1, -1],
    [10, 6, 7, 10, 7, 1, 1, 7, 3, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1, -1, -1, -1],
    [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],
    [7, 8, 0, 7, 0, 6, 6, 0, 2, -1, -1, -1, -1, -1, -1, -1],
    [7, 3, 2, 6, 7, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, -1, -1, -1, -1],
    [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],
    [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],
    [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1, -1, -1, -1],
    [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, -1],
    [0, 9, 1, 11, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1, -1, -1, -1],
    [7, 11, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, 0, 8, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 1, 9, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [8, 1, 9, 8, 3, 1, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
    [10, 1, 2, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, 3, 0, 8, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
    [2, 9, 0, 2, 10, 9, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
    [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1, -1, -1, -1],
    [7, 2, 3, 6, 2, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [7, 0, 8, 7, 6, 0, 6, 2, 0, -1, -1, -1, -1, -1, -1, -1],
    [2, 7, 6, 2, 3, 7, 0, 1, 9, -1, -1, -1, -1, -1, -1, -1],
    [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1, -1, -1, -1],
    [10, 7, 6, 10, 1, 7, 1, 3, 7, -1, -1, -1, -1, -1, -1, -1],
    [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1, -1, -1, -1],
    [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1, -1, -1, -1],
    [7, 6, 10, 7, 10, 8, 8, 10, 9, -1, -1, -1, -1, -1, -1, -1],
    [6, 8, 4, 11, 8, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, 6, 11, 3, 0, 6, 0, 4, 6, -1, -1, -1, -1, -1, -1, -1],
    [8, 6, 11, 8, 4, 6, 9, 0, 1, -1, -1, -1, -1, -1, -1, -1],
    [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, -1, -1, -1, -1],
    [6, 8, 4, 6, 11, 8, 2, 10, 1, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, -1, -1, -1, -1],
    [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1, -1, -1, -1],
    [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, -1],
    [8, 2, 3, 8, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1],
    [0, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1, -1, -1, -1],
    [1, 9, 4, 1, 4, 2, 2, 4, 6, -1, -1, -1, -1, -1, -1, -1],
    [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1, -1, -1, -1],
    [10, 1, 0, 10, 0, 6, 6, 0, 4, -1, -1, -1, -1, -1, -1, -1],
    [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, -1],
    [10, 9, 4, 6, 10, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 9, 5, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, 4, 9, 5, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
    [5, 0, 1, 5, 4, 0, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
    [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1, -1, -1, -1],
    [9, 5, 4, 10, 1, 2, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
    [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1, -1, -1, -1],
    [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1, -1, -1, -1],
    [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, -1],
    [7, 2, 3, 7, 6, 2, 5, 4, 9, -1, -1, -1, -1, -1, -1, -1],
    [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1, -1, -1, -1],
    [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1, -1, -1, -1],
    [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, -1],
    [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1, -1, -1, -1],
    [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, -1],
    [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, -1],
    [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1, -1, -1, -1],
    [6, 9, 5, 6, 11, 9, 11, 8, 9, -1, -1, -1, -1, -1, -1, -1],
    [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1, -1, -1, -1],
    [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1, -1, -1, -1],
    [6, 11, 3, 6, 3, 5, 5, 3, 1, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1, -1, -1, -1],
    [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, -1],
    [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, -1],
    [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1, -1, -1, -1],
    [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1, -1, -1, -1],
    [9, 5, 6, 9, 6, 0, 0, 6, 2, -1, -1, -1, -1, -1, -1, -1],
    [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, -1],
    [1, 5, 6, 2, 1, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, -1],
    [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1, -1, -1, -1],
    [0, 3, 8, 5, 6, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [10, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [11, 5, 10, 7, 5, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [11, 5, 10, 11, 7, 5, 8, 3, 0, -1, -1, -1, -1, -1, -1, -1],
    [5, 11, 7, 5, 10, 11, 1, 9, 0, -1, -1, -1, -1, -1, -1, -1],
    [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1, -1, -1, -1],
    [11, 1, 2, 11, 7, 1, 7, 5, 1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1, -1, -1, -1],
    [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1, -1, -1, -1],
    [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, -1],
    [2, 5, 10, 2, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1],
    [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1, -1, -1, -1],
    [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1, -1, -1, -1],
    [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, -1],
    [1, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 7, 0, 7, 1, 1, 7, 5, -1, -1, -1, -1, -1, -1, -1],
    [9, 0, 3, 9, 3, 5, 5, 3, 7, -1, -1, -1, -1, -1, -1, -1],
    [9, 8, 7, 5, 9, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [5, 8, 4, 5, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1],
    [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1, -1, -1, -1],
    [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1, -1, -1, -1],
    [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, -1],
    [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1, -1, -1, -1],
    [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, -1],
    [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, -1],
    [9, 4, 5, 2, 11, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1, -1, -1, -1],
    [5, 10, 2, 5, 2, 4, 4, 2, 0, -1, -1, -1, -1, -1, -1, -1],
    [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, -1],
    [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1, -1, -1, -1],
    [8, 4, 5, 8, 5, 3, 3, 5, 1, -1, -1, -1, -1, -1, -1, -1],
    [0, 4, 5, 1, 0, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1, -1, -1, -1],
    [9, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 11, 7, 4, 9, 11, 9, 10, 11, -1, -1, -1, -1, -1, -1, -1],
    [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1, -1, -1, -1],
    [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1, -1, -1, -1],
    [3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, -1],
    [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1, -1, -1, -1],
    [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, -1],
    [11, 7, 4, 11, 4, 2, 2, 4, 0, -1, -1, -1, -1, -1, -1, -1],
    [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1, -1, -1, -1],
    [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1, -1, -1, -1],
    [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, -1],
    [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, -1],
    [1, 10, 2, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 9, 1, 4, 1, 7, 7, 1, 3, -1, -1, -1, -1, -1, -1, -1],
    [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1, -1, -1, -1],
    [4, 0, 3, 7, 4, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [4, 8, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [9, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, 0, 9, 3, 9, 11, 11, 9, 10, -1, -1, -1, -1, -1, -1, -1],
    [0, 1, 10, 0, 10, 8, 8, 10, 11, -1, -1, -1, -1, -1, -1, -1],
    [3, 1, 10, 11, 3, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 2, 11, 1, 11, 9, 9, 11, 8, -1, -1, -1, -1, -1, -1, -1],
    [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1, -1, -1, -1],
    [0, 2, 11, 8, 0, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [3, 2, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [2, 3, 8, 2, 8, 10, 10, 8, 9, -1, -1, -1, -1, -1, -1, -1],
    [9, 10, 2, 0, 9, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1, -1, -1, -1],
    [1, 10, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [1, 3, 8, 9, 1, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 9, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [0, 3, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
];

const corners = [
    [0, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
    [1, 0, 1],
];

function vertexInterp(level, c0, c1, v0, v1) {
    const out = [];
    const mu = (level - v0) / (v1 - v0);
    for (let i = 0; i < 3; i++) {
        out.push((1 - mu) * c0[i] + mu * c1[i]);
    }
    return out;
}

function marchingCube(vals, level) {
    /*
      return triangles for Marching Cubes algorithm given vals on 8 corners
      and level
    */

    let cubeindex = 0;
    for (let i = 0; i < vals.length; i++) {
        const element = vals[i];
        if (element < level) {
            cubeindex |= Math.pow(2, i);
        }
    }

    /* Cube is entirely in/out of the surface */
    if (edgeTable[cubeindex] == 0) return [];

    const vertList = {};

    /* Find the vertices where the surface intersects the cube */
    if (edgeTable[cubeindex] & 1)
        vertList[0] = vertexInterp(level, corners[0], corners[1], vals[0], vals[1]);
    if (edgeTable[cubeindex] & 2)
        vertList[1] = vertexInterp(level, corners[1], corners[2], vals[1], vals[2]);
    if (edgeTable[cubeindex] & 4)
        vertList[2] = vertexInterp(level, corners[2], corners[3], vals[2], vals[3]);
    if (edgeTable[cubeindex] & 8)
        vertList[3] = vertexInterp(level, corners[3], corners[0], vals[3], vals[0]);
    if (edgeTable[cubeindex] & 16)
        vertList[4] = vertexInterp(level, corners[4], corners[5], vals[4], vals[5]);
    if (edgeTable[cubeindex] & 32)
        vertList[5] = vertexInterp(level, corners[5], corners[6], vals[5], vals[6]);
    if (edgeTable[cubeindex] & 64)
        vertList[6] = vertexInterp(level, corners[6], corners[7], vals[6], vals[7]);
    if (edgeTable[cubeindex] & 128)
        vertList[7] = vertexInterp(level, corners[7], corners[4], vals[7], vals[4]);
    if (edgeTable[cubeindex] & 256)
        vertList[8] = vertexInterp(level, corners[0], corners[4], vals[0], vals[4]);
    if (edgeTable[cubeindex] & 512)
        vertList[9] = vertexInterp(level, corners[1], corners[5], vals[1], vals[5]);
    if (edgeTable[cubeindex] & 1024)
        vertList[10] = vertexInterp(
            level,
            corners[2],
            corners[6],
            vals[2],
            vals[6]
        );
    if (edgeTable[cubeindex] & 2048)
        vertList[11] = vertexInterp(
            level,
            corners[3],
            corners[7],
            vals[3],
            vals[7]
        );

    /* Create the triangle */
    // let ntriang = 0;
    const triangles = [];
    for (let i = 0; triTable[cubeindex][i] != -1; i += 3) {
        triangles.push(vertList[triTable[cubeindex][i]]);
        triangles.push(vertList[triTable[cubeindex][i + 1]]);
        triangles.push(vertList[triTable[cubeindex][i + 2]]);
        // ntriang++;
    }

    return triangles;
}

export function marchingCubes({
    f,
    level = 0,
    xMin = -1,
    xMax = 1,
    yMin = -1,
    yMax = 1,
    zMin = -1,
    zMax = 1,
    N = 30,
} = {}) {
    const geometry = new THREE.BufferGeometry();

    const eps = Math.sqrt(1e-10);
    let h = eps;
    const vertices = [],
        normals = [];

    const dx = (xMax - xMin) / N,
        dy = (yMax - yMin) / N,
        dz = (zMax - zMin) / N;

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            for (let k = 0; k < N; k++) {
                const [x, y, z] = [xMin + dx * i, yMin + dy * j, zMin + dz * k];

                const grid = [
                    [x, y, z],
                    [x, y + dy, z],
                    [x + dx, y + dy, z],
                    [x + dx, y, z],
                    [x, y, z + dz],
                    [x, y + dy, z + dz],
                    [x + dx, y + dy, z + dz],
                    [x + dx, y, z + dz],
                ];

                const vals = [];
                grid.forEach((corner) => {
                    vals.push(f(...corner));
                });

                const pts = marchingCube(vals, level);

                for (let index = 0; index < pts.length; index++) {
                    const pt = pts[index];

                    const u = x + pt[0] * dx,
                        v = y + pt[1] * dy,
                        w = z + pt[2] * dz;

                    h = Math.max(u * eps, (2 * eps) ** 2);
                    const fx = (f(u + h / 2, v, w) - f(u - h / 2, v, w)) / h;
                    h = Math.max(v * eps, (2 * eps) ** 2);
                    const fy = (f(u, v + h / 2, w) - f(u, v - h / 2, w)) / h;
                    h = Math.max(w * eps, (2 * eps) ** 2);
                    const fz = (f(u, v, w + h / 2) - f(u, v, w - h / 2)) / h;

                    const norm = new THREE.Vector3(fx, fy, fz);
                    norm.normalize();

                    vertices.push(u, v, w);
                    normals.push(norm.x, norm.y, norm.z);
                }
            }
        }
    }

    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));

    return geometry;
}

// Find extremes of scalar function on vertices

export function vMaxMin(mesh, f) {
    let vMax, vMin;
    const points = mesh.geometry.attributes.position.array;
    vMax = f(points[0], points[1], points[2]);
    vMin = vMax;
    for (let i = 3; i < points.length; i += 3) {
        const w = f(points[i], points[i + 1], points[i + 2]);
        vMax = Math.max(vMax, w);
        vMin = Math.min(vMin, w);
    }
    return [vMax, vMin];
}

/* color the vertices of a geometry via f(x,y,z) -> {r,g,b} */
export function colorBufferVertices(mesh, f) {
    let colors = [];
    let vec = new THREE.Vector3();
    const points = mesh.geometry.attributes.position.array;
    for (let i = 0; i < points.length; i += 3) {
        vec.set(points[i], points[i + 1], points[i + 2]);
        let { x, y, z } = mesh.localToWorld(vec);
        let { r, g, b } = f(x, y, z);
        colors.push(r, g, b);
    }
    mesh.geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
    );
    // const points = geometry.attributes.position.array;
}

export const blueUpRedDown = function (x, grayness = 0.8, cm = 'gist_earth') {
    // blue-red too traumatic
    const color = new THREE.Color();
    x = Math.max(-1, Math.min(1, x));
    if (cm) {
        const [r, g, b] = evaluate_cmap((x + 1) / 2, cm);
        color.setRGB(r / 256, g / 256, b / 256);
    } else {
        if (x >= 0) {
            color.setRGB(
                (1 - 0.3 * x) * grayness,
                (1 - 0.9 * x) * grayness,
                (1 - x) * grayness
            );
        } else {
            color.setRGB(
                (1 + 0.7 * x) * grayness,
                (1 + x) * grayness,
                (1 + 0.7 * x) * grayness
            );
        }
    }
    return color;
};

export function addColorBar(vMin = -1, vMax = 1) {
    const container = document.createElement("div");
    container.classList.add("colorBar");
    document.body.append(container);
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    canvas.width = container.clientWidth / 2;
    canvas.height = container.clientHeight;
    canvas.style.height = "100%";

    const labels = document.createElement("div");
    labels.classList.add("colorBarTextContainer");
    container.appendChild(labels);

    const context = canvas.getContext("2d");
    // context.rect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // canvas.style.width = "1100px";

    // add linear gradient
    const grd = context.createLinearGradient(0, canvas.height, 0, 0);

    const vRange = vMax - vMin;
    for (let x = 0; x <= 1; x += 0.125) {
        const hexString = blueUpRedDown(x * 2 - 1).getHexString();
        grd.addColorStop(x, "#" + hexString);
        const textLabel = document.createElement("div");
        labels.appendChild(textLabel);
        textLabel.classList.add("colorBarText");
        textLabel.innerHTML =
            '<span class="colorBarText" style="vertical-align:text-top">' +
            (Math.round((vMin + x * vRange) * 100) / 100).toString() +
            "</span>";
        textLabel.style.bottom = (100 * x).toString() + "%";
        textLabel.style.left = "0px";
    }
    context.fillStyle = grd;
    context.fillRect(0, 0, canvas.width, canvas.height);
    container.style.display = "block";
}

export function thetaCoordinate(x, y) {
    let t;
    if (x > 0) {
        t = Math.atan(y / x);
    } else {
        if (x < 0) {
            if (y >= 0) {
                t = Math.PI + Math.atan(y / x);
            } else {
                t = -Math.PI + Math.atan(y / x);
            }
        } else {
            if (y >= 0) {
                t = Math.PI / 2;
            } else {
                t = -Math.PI / 2;
            }
        }
    }
    return t;
    // if (t < 0 && positive) {
    //   return 2*Math.PI + t;
    // } else {
    //   return t ;
    // }
}

export function marchingSegments(f, a = 0, b = 1, nX = 100) {
    const dx = (b - a) / nX;
    const zeros = [];
    for (let i = 0; i < nX; i++) {
        const x0 = a + i * dx,
            x1 = a + (i + 1) * dx;
        const y0 = f(x0),
            y1 = f(x1);
        if (y0 * y1 < 0) {
            zeros.push(x0 - (y0 * (x1 - x0)) / (y1 - y0));
        }
    }
    return zeros;
}

// Modified from https://github.com/mrdoob/three.js/blob/master/src/geometries/CylinderBufferGeometry.js
class ArrowBufferGeometry extends THREE.BufferGeometry {
    constructor({
        radiusTop = 1 / 16,
        radiusBottom = 1 / 20,
        height = 1,
        heightTop = 1 / 6,
        radialSegments = 8,
        heightSegments = 1,
        openEnded = false,
        heightIncludesHead = true,
    } = {}) {
        super();
        this.type = "ArrowBufferGeometry";

        this.parameters = {
            radiusTop: radiusTop,
            radiusBottom: radiusBottom,
            height: height,
            heightTop: heightTop,
            radialSegments: radialSegments,
            heightSegments: heightSegments,
            openEnded: openEnded,
            heightIncludesHead: heightIncludesHead,
        };

        const scope = this;
        const thetaStart = 0,
            thetaLength = 2 * Math.PI;

        radialSegments = Math.floor(radialSegments);
        heightSegments = Math.floor(heightSegments);

        // buffers

        const indices = [];
        const vertices = [];
        const normals = [];
        const uvs = [];

        // helper variables

        let index = 0;
        const indexArray = [];
        const tubeHeight = heightIncludesHead ? height - heightTop : height;
        let groupStart = 0;

        // generate geometry

        generateTorso();
        generateCap(true);
        generateCap(false, true);

        if (openEnded === false) {
            if (radiusBottom > 0) generateCap(false);
        }

        // build geometry

        this.setIndex(indices);
        this.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(vertices, 3)
        );
        this.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
        this.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

        function generateTorso() {
            const normal = new THREE.Vector3();
            const vertex = new THREE.Vector3();

            let groupCount = 0;

            // generate vertices, normals and uvs

            for (let y = 0; y <= heightSegments; y++) {
                const indexRow = [];

                const v = y / heightSegments;

                // calculate the radius of the current row

                const radius = radiusBottom;

                for (let x = 0; x <= radialSegments; x++) {
                    const u = x / radialSegments;

                    const theta = u * Math.PI * 2;

                    const sinTheta = Math.sin(theta);
                    const cosTheta = Math.cos(theta);

                    // vertex

                    vertex.x = radius * cosTheta;
                    vertex.y = radius * sinTheta;
                    vertex.z = v * tubeHeight;
                    vertices.push(vertex.x, vertex.y, vertex.z);

                    // normal

                    normal.set(cosTheta, sinTheta, 0).normalize();
                    normals.push(normal.x, normal.y, normal.z);

                    // uv

                    uvs.push(u, 1 - v);

                    // save index of vertex in respective row

                    indexRow.push(index++);
                }

                // now save vertices of the row in our index array

                indexArray.push(indexRow);
            }

            // generate indices

            for (let x = 0; x < radialSegments; x++) {
                for (let y = 0; y < heightSegments; y++) {
                    // we use the index array to access the correct indices

                    const a = indexArray[y][x];
                    const b = indexArray[y + 1][x];
                    const c = indexArray[y + 1][x + 1];
                    const d = indexArray[y][x + 1];

                    // faces

                    indices.push(b, a, d);
                    indices.push(c, b, d);

                    // update group counter

                    groupCount += 6;
                }
            }

            // add a group to the geometry. this will ensure multi material support

            scope.addGroup(groupStart, groupCount, 0);

            // calculate new start value for groups

            groupStart += groupCount;
        }

        function generateCap(top, headBase = false) {
            // save the index of the first center vertex
            const centerIndexStart = index;

            const uv = new THREE.Vector2();
            const vertex = new THREE.Vector3();

            let groupCount = 0;

            const radius = top || headBase ? radiusTop : radiusBottom;
            const sign = top ? 1 : -1;

            // first we generate the center vertex data of the cap.
            // because the geometry needs one set of uvs per face,
            // we must generate a center vertex per face/segment

            for (let x = 1; x <= radialSegments; x++) {
                // vertex

                vertices.push(
                    0,
                    0,
                    top ? tubeHeight + heightTop : headBase ? tubeHeight : 0
                );

                // normal

                if (top) {
                    const theta = ((x - 1 / 2) / radialSegments) * Math.PI * 2;
                    const sinTheta = Math.sin(theta),
                        cosTheta = Math.cos(theta);
                    const normal = new THREE.Vector3(
                        cosTheta,
                        sinTheta,
                        radiusTop / heightTop
                    );
                    normal.normalize();
                    normals.push(normal.x, normal.y, normal.z);
                } else {
                    normals.push(0, 0, sign);
                }
                // uv

                uvs.push(0.5, 0.5);

                // increase index

                index++;
            }

            // save the index of the last center vertex
            const centerIndexEnd = index;

            // now we generate the surrounding vertices, normals and uvs

            for (let x = 0; x <= radialSegments; x++) {
                const u = x / radialSegments;
                const theta = u * thetaLength + thetaStart;

                const cosTheta = Math.cos(theta);
                const sinTheta = Math.sin(theta);

                // vertex

                vertex.x = radius * cosTheta;
                vertex.y = radius * sinTheta;
                vertex.z = top || headBase ? tubeHeight : 0;
                vertices.push(vertex.x, vertex.y, vertex.z);

                // normal

                if (top) {
                    const normal = new THREE.Vector3(
                        cosTheta,
                        sinTheta,
                        radiusTop / heightTop
                    );
                    normal.normalize();
                    normals.push(normal.x, normal.y, normal.z);
                } else {
                    normals.push(0, 0, sign);
                }
                // uv

                uv.x = cosTheta * 0.5 + 0.5;
                uv.y = sinTheta * 0.5 * sign + 0.5;
                uvs.push(uv.x, uv.y);

                // increase index

                index++;
            }

            // generate indices

            for (let x = 0; x < radialSegments; x++) {
                const c = centerIndexStart + x;
                const i = centerIndexEnd + x;

                if (top === true) {
                    // face top

                    indices.push(i, i + 1, c);
                } else {
                    // face bottom

                    indices.push(i + 1, i, c);
                }

                groupCount += 3;
            }

            // add a group to the geometry. this will ensure multi material support

            scope.addGroup(groupStart, groupCount, top === true ? 1 : 2);

            // calculate new start value for groups

            groupStart += groupCount;
        }
    }

    adjustHeight(newHeight) {
        const points = this.attributes.position.array;
        const oldHeight = points[56];

        let index = 0;
        for (let i = 0; i < points.length / 3; i++) {
            index++;
            index++;
            const z = points[index];

            if (z !== 0) {
                points[index] += newHeight - oldHeight;
            }
            index++;
        }
        this.parameters.height = newHeight;
        this.attributes.position.needsUpdate = true;
    }
}

function adjustArrowHeight(geometry, newHeight) {
    const points = geometry.attributes.position.array;
    const oldHeight = points[56];

    let index = 0;
    for (let i = 0; i < points.length / 3; i++) {
        index++;
        index++;
        const z = points[index];

        if (z !== 0) {
            points[index] += newHeight - oldHeight;
        }
        index++;
    }

    geometry.parameters.height = newHeight;
    geometry.attributes.position.needsUpdate = true;
}

function drawGrid({
    coords = "rect",
    gridMax = 1,
    gridStep = 0.1,
    lineMaterial = new THREE.LineBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.8,
    }),
} = {}) {
    let points = [];

    if (coords === "rect") {
        for (let j = -(10 * gridMax); j <= 10 * gridMax; j += gridStep) {
            points.push(new THREE.Vector3(j, -(10 * gridMax), 0));
            points.push(new THREE.Vector3(j, 10 * gridMax, 0));

            points.push(new THREE.Vector3(-(10 * gridMax), j, 0));
            points.push(new THREE.Vector3(10 * gridMax, j, 0));
        }
    } else {
        // polar grid
        for (let i = 0; i <= 10 * gridMax; i += gridStep) {
            for (let j = 0; j < 100; j++) {
                points.push(
                    new THREE.Vector3(
                        i * Math.cos((2 * Math.PI * j) / 100),
                        i * Math.sin((2 * Math.PI * j) / 100),
                        0
                    )
                );
                points.push(
                    new THREE.Vector3(
                        i * Math.cos((2 * Math.PI * (j + 1)) / 100),
                        i * Math.sin((2 * Math.PI * (j + 1)) / 100),
                        0
                    )
                );
            }
        }
        for (let i = 0; i < 16; i++) {
            points.push(
                new THREE.Vector3(
                    10 * gridMax * Math.cos((Math.PI * i) / 8),
                    10 * gridMax * Math.sin((Math.PI * i) / 8),
                    0
                )
            );
            points.push(new THREE.Vector3(0, 0, 0));
        }
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.LineSegments(geometry, lineMaterial);
}

function drawAxes({
    gridMax = 1,
    gridStep = 0.1,
    axesMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 }),
} = {}) {
    const axesHolder = new THREE.Object3D();
    const axisGeometry = new ArrowBufferGeometry({
        radiusTop: gridStep / 9,
        radiusBottom: gridStep / 16,
        height: gridMax * 3,
        heightTop: (gridStep / 3) * 2,
        heightIncludesHead: false,
    });
    for (let index = 0; index < 3; index++) {
        let arrow = new THREE.Mesh(axisGeometry, axesMaterial);
        if (index === 0) {
            arrow.lookAt(1, 0, 0);
            arrow.position.x = (-gridMax * 3) / 2;
        } else {
            if (index === 2) {
                arrow.lookAt(0, 1, 0);
                arrow.position.y = (-gridMax * 3) / 2;
            } else {
                arrow.position.z = (-gridMax * 3) / 2;
            }
        }
        axesHolder.add(arrow);
    }
    return axesHolder;
}

class ParametricCurve extends THREE.Curve {
    constructor(scale = 1, r = (t) => new THREE.Vector3(t, t, t), a = 0, b = 1) {
        super();

        this.scale = scale;

        this.r = r;

        this.a = a;

        this.b = b;
    }

    getPoint(t, optionalTarget = new THREE.Vector3()) {
        const s = this.a + (this.b - this.a) * t;

        const { x, y, z } = this.r(s);

        return optionalTarget.set(x, y, z).multiplyScalar(this.scale);
    }
}

function labelAxes({
    scene,
    gridMax = 1,
    gridStep = 0.1,
    fontFile = './fonts/P052_Italic.json',
    textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }),
    axesText = [],
    render = undefined,
} = {}, fontLoader, TextGeometry) {
    let fontUrl = fontFile;
    // Use static prefix from Django if present
    if (window.STATIC_PREFIX) {
        fontUrl = joinUrl(window.STATIC_PREFIX, fontFile);
    }

    const font = fontLoader.load(
        // resource URL
        fontUrl,
        function (font) {
            // clear out the old
            for (let index = 0; index < axesText.length; index++) {
                const element = axesText[index];
                if (element.children) {
                    element.children[0].geometry.dispose();
                }
                scene.remove(element);
            }
            axesText.length = 0;
            const xyz = ["x", "y", "z"];
            const tPos = 1.7 * gridMax;
            const textGeometryArguments = {
                font: font,
                size: (gridStep * 2) / 3,
                depth: 0,
                curveSegments: 12,
                bevelEnabled: false,
            };
            const tickGeos = [];
            for (let i = 0; i <= 6; i++) {
                if (i !== 3) {
                    const textGeo = new TextGeometry(
                        (Math.round(100 * ((-3 / 2 + i / 2) * gridMax)) / 100).toString(),
                        textGeometryArguments
                    );
                    tickGeos.push(textGeo);
                    textGeo.computeBoundingBox();
                }
            }
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 6; j++) {
                    // const geo = new THREE.BufferGeometry();
                    const text = new THREE.Mesh(tickGeos[j], textMaterial);
                    const textHolder = new THREE.Object3D();
                    tickGeos[j].boundingBox.getCenter(text.position).multiplyScalar(-1);
                    textHolder.position[xyz[i]] =
                        (-3 / 2 + j / 2 + (j > 2 ? 1 / 2 : 0)) * gridMax;
                    textHolder.position[xyz[((i + 1) % 3) + (i === 0 ? 1 : 0)]] =
                        -gridStep;
                    textHolder.add(text);
                    axesText.push(textHolder);
                    scene.add(textHolder);
                }
                const textGeo = new TextGeometry(xyz[i], textGeometryArguments);
                // const textMaterial = new THREE.MeshBasicMaterial({color: axesMaterial})
                const textHolder = new THREE.Object3D();
                const text = new THREE.Mesh(textGeo, textMaterial);
                // text.computeBoundingBox();

                textGeo.computeBoundingBox();
                textGeo.boundingBox.getCenter(text.position).multiplyScalar(-1);

                textHolder.position[xyz[i]] = tPos;

                textHolder.add(text);
                scene.add(textHolder);
                axesText.push(textHolder);
                if (render) render();
            }
        },
        // onProgress callback
        function () { },

        // onError callback
        function (e) {
            console.error('Font loading error:', e);
        }
    );
    return [axesText, font];
}


const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));
const M = (n) => (n - (n % 2 !== 0)) / 2;

/**
 * Gauss-Legendre quadrature via https://rosettacode.org/wiki/Numerical_integration/Gauss-Legendre_Quadrature#JavaScript
 * @param {function} fn function to integrate
 * @param {number} a lower bound
 * @param {number} b upper bound
 * @param {number} n number of sample points
 * @returns 
 */
const gaussLegendre = (fn, a, b, n) => {
    // coefficients of the Legendre polynomial
    const coef = [...Array(M(n) + 1)].map(
        (v, m) =>
        (v =
            ((-1) ** m * factorial(2 * n - 2 * m)) /
            (2 ** n * factorial(m) * factorial(n - m) * factorial(n - 2 * m)))
    );
    // the polynomial function
    const f = (x) =>
        coef
            .map((v, i) => v * x ** (n - 2 * i))
            .reduce((sum, item) => sum + item, 0);
    const terms = coef.length - (n % 2 === 0);
    // coefficients of the derivative polybomial
    const dcoef = [...Array(terms)]
        .map((v, i) => (v = n - 2 * i))
        .map((val, i) => val * coef[i]);
    // the derivative polynomial function
    const df = (x) =>
        dcoef
            .map((v, i) => v * x ** (n - 1 - 2 * i))
            .reduce((sum, item) => sum + item, 0);
    const guess = [...Array(n)].map((v, i) =>
        Math.cos((Math.PI * (i + 1 - 1 / 4)) / (n + 1 / 2))
    );
    // Newton Raphson
    const roots = guess.map((xo) =>
        [...Array(100)].reduce((x) => x - f(x) / df(x), xo)
    );
    const weights = roots.map((v) => 2 / ((1 - v ** 2) * df(v) ** 2));
    return (
        ((b - a) / 2) *
        weights
            .map((v, i) => v * fn(((b - a) * roots[i]) / 2 + (a + b) / 2))
            .reduce((sum, item) => sum + item, 0)
    );
};

// Runge-Kutta method
function rk4(x, y, z, F, dt) {
    // Returns final (x1,y1,z1) array after time dt has passed.
    //        x,y,z: initial position
    //        F: r' function a(x,v,dt) (must be callable)
    //        dt: timestep
    const vec = new THREE.Vector3(),
        f1 = new THREE.Vector3(),
        f2 = new THREE.Vector3(),
        f3 = new THREE.Vector3(),
        f4 = new THREE.Vector3();

    f1.copy(F(x, y, z, vec).multiplyScalar(dt));
    f2.copy(F(x + f1.x / 2, y + f1.y / 2, z + f1.z / 2, vec).multiplyScalar(dt));
    f3.copy(F(x + f2.x / 2, y + f2.y / 2, z + f2.z / 2, vec).multiplyScalar(dt));
    f4.copy(F(x + f3.x, y + f3.y, z + f3.z, vec).multiplyScalar(dt));

    const x1 = x + (f1.x + 2 * f2.x + 2 * f3.x + f4.x) / 6;
    const y1 = y + (f1.y + 2 * f2.y + 2 * f3.y + f4.y) / 6;
    const z1 = z + (f1.z + 2 * f2.z + 2 * f3.z + f4.z) / 6;

    return [x1, y1, z1];
}

function lcm(x, y) {
    if (typeof x !== "number" || typeof y !== "number") return false;
    return !x || !y ? 0 : Math.abs((x * y) / gcd(x, y));
}

export function gcd(x, y) {
    x = Math.abs(x);
    y = Math.abs(y);
    while (y) {
        var t = y;
        y = x % y;
        x = t;
    }
    return x;
}

// 1-norm
function norm1(v) {
    return Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
}

function disposeArray() {
    this.array = null;
}

function freeChildren(objectHolder) {
    for (let i = objectHolder.children.length - 1; i >= 0; i--) {
        const element = objectHolder.children[i];
        if (element.geometry.dispose) element.geometry.dispose();
        objectHolder.remove(element);
    }
}
function nextHue(hue) {
    return (hue + 0.618033988749895) % 1;
}

function makeHSLColor(hue) {
    const s = `hsl(${(256 * hue).toString()},99%,33%)`;
    const outColor = new THREE.Color(s);
    return outColor;
}

class ParametricGeometry extends THREE.BufferGeometry {
    constructor(
        func = (u, v, target) => target.set(u, v, Math.cos(u) * Math.sin(v)),
        slices = 8,
        stacks = 8
    ) {
        super();

        this.type = "ParametricGeometry";

        this.parameters = {
            func: func,
            slices: slices,
            stacks: stacks,
        };

        // buffers

        const indices = [];
        const vertices = [];
        const normals = [];
        const uvs = [];

        const EPS = 0.00001;

        const normal = new THREE.Vector3();

        const p0 = new THREE.Vector3(),
            p1 = new THREE.Vector3(),
            p2 = new THREE.Vector3();
        const pu = new THREE.Vector3(),
            pv = new THREE.Vector3();

        if (func.length < 3) {
            console.error(
                "ParametricGeometry: Function must now modify a Vector3 as third parameter."
            );
        }

        // generate vertices, normals and uvs

        const sliceCount = slices + 1;

        for (let i = 0; i <= stacks; i++) {
            const v = i / stacks;

            for (let j = 0; j <= slices; j++) {
                const u = j / slices;

                // vertex

                func(u, v, p0);
                vertices.push(p0.x, p0.y, p0.z);

                // normal

                // approximate tangent vectors via finite differences

                if (u - EPS >= 0) {
                    func(u - EPS, v, p1);
                    pu.subVectors(p0, p1);
                } else {
                    func(u + EPS, v, p1);
                    pu.subVectors(p1, p0);
                }

                // check for degenerate parametrizations
                if (pu.length() < EPS * EPS) {
                    if (v - EPS >= 0) {
                        if (u - EPS >= 0) {
                            func(u - EPS, v - EPS, p1);
                            func(u, v - EPS, p2);
                            pu.subVectors(p2, p1);
                        } else {
                            func(u + EPS, v - EPS, p1);
                            func(u, v - EPS, p2);
                            pu.subVectors(p1, p2);
                        }
                    } else {
                        if (u - EPS >= 0) {
                            func(u - EPS, v + EPS, p1);
                            func(u, v + EPS, p2);
                            pu.subVectors(p2, p1);
                        } else {
                            func(u + EPS, v + EPS, p1);
                            func(u, v + EPS, p2);
                            pu.subVectors(p1, p2);
                        }
                    }
                }

                if (v - EPS >= 0) {
                    func(u, v - EPS, p1);
                    pv.subVectors(p0, p1);
                } else {
                    func(u, v + EPS, p1);
                    pv.subVectors(p1, p0);
                }

                // check for degenerate parametrizations
                if (pv.length() < EPS * EPS) {
                    if (u - EPS >= 0) {
                        if (v - EPS >= 0) {
                            func(u - EPS, v - EPS, p1);
                            func(u - EPS, v, p2);
                            pv.subVectors(p2, p1);
                        } else {
                            func(u - EPS, v + EPS, p1);
                            func(u - EPS, v, p2);
                            pv.subVectors(p1, p2);
                        }
                    } else {
                        if (v - EPS >= 0) {
                            func(u + EPS, v - EPS, p1);
                            func(u + EPS, v, p2);
                            pv.subVectors(p2, p1);
                        } else {
                            func(u + EPS, v + EPS, p1);
                            func(u + EPS, v, p2);
                            pv.subVectors(p1, p2);
                        }
                    }
                }

                // cross product of tangent vectors returns surface normal

                normal.crossVectors(pu, pv).normalize();
                normals.push(normal.x, normal.y, normal.z);

                // uv

                uvs.push(u, v);
            }
        }

        // generate indices

        for (let i = 0; i < stacks; i++) {
            for (let j = 0; j < slices; j++) {
                const a = i * sliceCount + j;
                const b = i * sliceCount + j + 1;
                const c = (i + 1) * sliceCount + j + 1;
                const d = (i + 1) * sliceCount + j;

                // faces one and two

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        // build geometry

        this.setIndex(indices);
        this.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(vertices, 3)
        );
        this.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
        this.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    }
}

function blockGeometry(f, a, b, c, d, M = 5, N = 5, s = 0.5, t = 0.5) {
    /* return a geometry of an approximation of f on the rectangle [a,b] \times [c,d]
       using M\times N subrectangles and sampling at (s,t) (relative coords) in each.*/

    let points = [];
    let colors = [];
    let normals = [];
    let dx = (b - a) / N;
    let dy = (d - c) / M;
    let color = new THREE.Color();

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < M; j++) {
            let x, y, z;
            x = a + i * dx;
            y = c + j * dy;
            z = f(x + s * dx, y + t * dy);
            const sz = z >= 0 ? 1 : -1;
            let zup, zdown;
            if (sz == 1) {
                zup = z;
                zdown = 0;
            } else {
                zup = 0;
                zdown = z;
            }

            color.setHSL(z < 0 ? 0.05 : 0.6, 0.56, 0.36);

            // top
            for (let i = 0; i < 6; i++) {
                normals.push(0, 0, 1);
                colors.push(color.r, color.g, color.b);
            }
            points.push(x, y, zup);
            points.push(x + dx, y, zup);
            points.push(x + dx, y + dy, zup);
            points.push(x, y, zup);
            points.push(x + dx, y + dy, zup);
            points.push(x, y + dy, zup);

            // bottom
            for (let i = 0; i < 6; i++) {
                normals.push(0, 0, -1);
                colors.push(color.r, color.g, color.b);
            }
            points.push(x, y, zdown);
            points.push(x + dx, y + dy, zdown);
            points.push(x + dx, y, zdown);
            points.push(x, y, zdown);
            points.push(x, y + dy, zdown);
            points.push(x + dx, y + dy, zdown);

            //south
            for (let i = 0; i < 6; i++) {
                normals.push(0, -1, 0);
                colors.push(color.r, color.g, color.b);
            }
            points.push(x, y, zdown);
            points.push(x + dx, y, zdown);
            points.push(x + dx, y, zup);
            points.push(x, y, zdown);
            points.push(x + dx, y, zup);
            points.push(x, y, zup);

            //north
            for (let i = 0; i < 6; i++) {
                normals.push(0, 1, 0);
                colors.push(color.r, color.g, color.b);
            }
            points.push(x, y + dy, zdown);
            points.push(x + dx, y + dy, zup);
            points.push(x + dx, y + dy, zdown);
            points.push(x, y + dy, zdown);
            points.push(x, y + dy, zup);
            points.push(x + dx, y + dy, zup);

            //west
            for (let i = 0; i < 6; i++) {
                normals.push(-sz, 0, 0);
                colors.push(color.r, color.g, color.b);
            }
            points.push(x, y, zdown);
            points.push(x, y, zup);
            points.push(x, y + dy, zup);
            points.push(x, y, zdown);
            points.push(x, y + dy, zup);
            points.push(x, y + dy, zdown);

            //east
            for (let i = 0; i < 6; i++) {
                normals.push(1, 0, 0);
                colors.push(color.r, color.g, color.b);
            }
            points.push(x + dx, y, zdown);
            points.push(x + dx, y + dy, zup);
            points.push(x + dx, y, zup);
            points.push(x + dx, y, zdown);
            points.push(x + dx, y + dy, zdown);
            points.push(x + dx, y + dy, zup);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(points, 3).onUpload(disposeArray)
    );
    geometry.setAttribute(
        "normal",
        new THREE.Float32BufferAttribute(normals, 3).onUpload(disposeArray)
    );
    geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3).onUpload(disposeArray)
    );

    return geometry;
}

function isDependentOn(node, x) {
    return node.filter((node) => node.isSymbolNode && node.name === x).length > 0;
}

/**
 * Cast the given input into a number, in a forgiving way.
 */
const forceNumber = function (n) {
    n = Number(n);
    if (isNaN(n) || typeof n === 'undefined') {
        n = 0;
    }
    return n;
};

/**
 * Return the dom element with the given query selector that
 * contains the given text.
 *
 * https://stackoverflow.com/a/67398903/173630
 */
const querySelectorIncludesText = function (selector, text) {
    return Array.from(document.querySelectorAll(selector))
        .find(el => el.textContent.includes(text));
};

function checksum(s)
/**
 * A simple checksum for strings. 
 */ {
    let chk = 0x12345678;
    const len = s.length;
    for (let i = 0; i < len; i++) {
        chk += (s.charCodeAt(i) * (i + 1));
    }

    return (chk & 0xffffffff).toString(16);
}

// https://stackoverflow.com/a/43827557/173630
const modFloor = function (a, n) {
    return ((a % n) + n) % n;
};

/**
 * @callback oneVarFunc
 * @param {number} x
 * @returns {number}
 */

/**
 * @callback twoVarFunc
 * @param {number} x
 * @param {number} y
 * @returns {number}
 */

/**
 * Geometry for solid regions
 */
class RectangularSolidGeometry extends THREE.BufferGeometry {
    /**
     * 
     * @param {number} a 
     * @param {number} b 
     * @param {number|oneVarFunc} c 
     * @param {number|oneVarFunc} d
     * @param {number|twoVarFunc} e 
     * @param {number|twoVarFunc} f 
     * @param {number} [nX=30] nX resolution in x direction
     * @param {number} [ny=30] ny resolution in y direction
     */
    constructor(a, b, c, d, e, f, nX = 30, nY = 30) {
        super();

        const dt = 1e-4; // for computing diffs
        const dt2 = dt / 2;

        const points = [];
        const normals = [];
        const indices = [];
        // const uvs = [];
        const vec = new THREE.Vector3();

        // let pindex = 0;
        // let nindex = 0

        const dx = (b - a) / nX;
        let dy;
        // bottom

        for (let i = 0; i <= nX; i++) {
            dy = (d(a + i * dx) - c(a + i * dx)) / nY;
            for (let j = 0; j <= nY; j++) {
                points.push(a + i * dx, c(a + i * dx) + j * dy, e(a + i * dx, c(a + i * dx) + j * dy));
                vec.set(
                    e(a + i * dx + dt2, c(a + i * dx) + j * dy)
                    - e(a + i * dx - dt2, c(a + i * dx) + j * dy),
                    e(a + i * dx, c(a + i * dx) + j * dy + dt2)
                    - e(a + i * dx, c(a + i * dx) + j * dy - dt2),
                    -dt
                ).normalize();
                normals.push(vec.x, vec.y, vec.z);
            }
        }
        for (let i = 0; i < nX; i++) {
            for (let j = 0; j < nY; j++) {
                indices.push(i * (nY + 1) + j, i * (nY + 1) + j + 1, (i + 1) * (nY + 1) + j);
                indices.push((i + 1) * (nY + 1) + j, i * (nY + 1) + j + 1, (i + 1) * (nY + 1) + (j + 1));
            }
        }

        // top
        let base = points.length / 3;

        for (let i = 0; i <= nX; i++) {
            dy = (d(a + i * dx) - c(a + i * dx)) / nY;
            for (let j = 0; j <= nY; j++) {
                points.push(a + i * dx, c(a + i * dx) + j * dy, f(a + i * dx, c(a + i * dx) + j * dy));
                vec.set(
                    f(a + i * dx + dt2, c(a + i * dx) + j * dy)
                    - f(a + i * dx - dt2, c(a + i * dx) + j * dy),
                    f(a + i * dx, c(a + i * dx) + j * dy + dt2)
                    - f(a + i * dx, c(a + i * dx) + j * dy - dt2),
                    -dt
                ).multiplyScalar(-1).normalize();
                normals.push(vec.x, vec.y, vec.z);
            }
        }
        for (let i = 0; i < nX; i++) {
            for (let j = 0; j < nY; j++) {
                indices.push(base + i * (nY + 1) + j + 1, base + i * (nY + 1) + j, base + (i + 1) * (nY + 1) + j);
                indices.push(base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + j, base + (i + 1) * (nY + 1) + (j + 1));
            }
        }


        // front

        base = points.length / 3;

        for (let i = 0; i <= nX; i++) {
            const z0 = e(a + i * dx, c(a + i * dx));
            const z1 = f(a + i * dx, c(a + i * dx));
            vec.set(
                c(a + i * dx + dt2) - c(a + i * dx - dt2),
                -dt,
                0
            ).normalize();
            for (let j = 0; j <= nX; j++) {
                points.push(
                    a + i * dx,
                    c(a + i * dx),
                    z0 + j / nX * (z1 - z0));
                normals.push(vec.x, vec.y, vec.z);
            }
        }
        for (let i = 0; i < nX; i++) {
            for (let j = 0; j < nX; j++) {
                indices.push(base + (i * (nX + 1) + j)
                    , base + ((i + 1) * (nX + 1) + j), base + (i * (nX + 1) + j) + 1);
                indices.push(base + ((i + 1) * (nX + 1) + j), base + ((i + 1) * (nX + 1) + j) + 1, base + (i * (nX + 1) + j) + 1);
            }
        }

        // back

        base = points.length / 3;

        for (let i = 0; i <= nX; i++) {
            const z0 = e(a + i * dx, d(a + i * dx));
            const z1 = f(a + i * dx, d(a + i * dx));
            vec.set(
                d(a + i * dx + dt2) - d(a + i * dx - dt2),
                -dt,
                0
            ).normalize();
            for (let j = 0; j <= nX; j++) {
                points.push(
                    a + i * dx,
                    d(a + i * dx),
                    z0 + j / nX * (z1 - z0));
                normals.push(vec.x, vec.y, vec.z);
            }
        }
        for (let i = 0; i < nX; i++) {
            for (let j = 0; j < nX; j++) {
                indices.push(base + (i * (nX + 1) + j)
                    , base + ((i + 1) * (nX + 1) + j), base + (i * (nX + 1) + j) + 1);
                indices.push(base + ((i + 1) * (nX + 1) + j), base + ((i + 1) * (nX + 1) + j) + 1, base + (i * (nX + 1) + j) + 1);
            }
        }

        // left

        base = points.length / 3;

        dy = (d(a) - c(a)) / nY;
        for (let i = 0; i <= nY; i++) {
            const z0 = e(a, c(a) + i * dy);
            const z1 = f(a, c(a) + i * dy);

            for (let j = 0; j <= nX; j++) {

                points.push(
                    a,
                    c(a) + i * dy,
                    z0 + j / nX * (z1 - z0)
                );
                normals.push(-1, 0, 0);
            }
        }
        for (let i = 0; i < nY; i++) {
            for (let j = 0; j < nX; j++) {
                indices.push(base + (i * (nX + 1) + j)
                    , base + ((i + 1) * (nX + 1) + j), base + (i * (nX + 1) + j) + 1);
                indices.push(base + ((i + 1) * (nX + 1) + j), base + ((i + 1) * (nX + 1) + j) + 1, base + (i * (nX + 1) + j) + 1);
            }
        }

        // right

        base = points.length / 3;
        dy = (d(b) - c(b)) / nY;
        for (let i = 0; i <= nY; i++) {
            const z0 = e(b, c(b) + i * dy);
            const z1 = f(b, c(b) + i * dy);

            for (let j = 0; j <= nX; j++) {
                points.push(
                    b,
                    c(b) + i * dy,
                    z0 + j / nX * (z1 - z0)
                );
                normals.push(1, 0, 0);
            }
        }
        for (let i = 0; i < nY; i++) {
            for (let j = 0; j < nX; j++) {
                indices.push(base + (i * (nX + 1) + j)
                    , base + ((i + 1) * (nX + 1) + j), base + (i * (nX + 1) + j) + 1);
                indices.push(base + ((i + 1) * (nX + 1) + j), base + ((i + 1) * (nX + 1) + j) + 1, base + (i * (nX + 1) + j) + 1);
            }
        }

        this.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        this.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        this.setIndex(indices);
    }
}


/**
 * Geometry for solid regions
 */
class CylindricalSolidGeometry extends THREE.BufferGeometry {
    /**
     * 
     * @param {number} a theta lower bound
     * @param {number} b theta upper bound
     * @param {number|oneVarFunc} c r lower
     * @param {number|oneVarFunc} d r upper
     * @param {number|twoVarFunc} e z lower
     * @param {number|twoVarFunc} f z upper
     * @param {number} [nX=20] nX resolution in r direction
     * @param {number} [nY=60] ny resolution in theta direction
     */
    constructor(a, b, c, d, e, f, nX = 20, nY = 60) {
        super();

        const { sin, cos } = Math;

        const dt = 1e-4; // for computing diffs
        const dt2 = dt / 2;

        const points = [];
        const normals = [];
        const indices = [];
        const vec = new THREE.Vector3();

        const dx = (b - a) / nX;
        let dy;
        // bottom

        for (let i = 0; i <= nX; i++) {
            const th = a + i * dx;
            dy = (d(a + i * dx) - c(a + i * dx)) / nY;
            for (let j = 0; j <= nY; j++) {
                const r = c(th) + j * dy;
                points.push(r * cos(th), r * sin(th), e(r, th));
                vec.set(
                    (e(r, th + dt2) - e(r, th - dt2)) * sin(th)
                    - (e(r + dt2, th) - e(r - dt2, th)) * r * cos(th),
                    - (e(r, th + dt2) - e(r, th - dt2)) * cos(th)
                    - (e(r + dt2, th) - e(r - dt2, th)) * r * sin(th),
                    r * dt
                ).multiplyScalar(-1).normalize();
                normals.push(vec.x, vec.y, vec.z);
            }
        }
        for (let i = 0; i < nX; i++) {
            for (let j = 0; j < nY; j++) {
                indices.push(i * (nY + 1) + j, (i + 1) * (nY + 1) + j, i * (nY + 1) + j + 1);
                indices.push((i + 1) * (nY + 1) + j, (i + 1) * (nY + 1) + (j + 1), i * (nY + 1) + j + 1);
            }
        }

        // top
        let base = points.length / 3;

        for (let i = 0; i <= nX; i++) {
            const th = a + i * dx;
            dy = (d(a + i * dx) - c(a + i * dx)) / nY;
            for (let j = 0; j <= nY; j++) {
                const r = c(th) + j * dy;
                points.push(r * cos(th), r * sin(th), f(r, th));
                vec.set(
                    (f(r, th + dt2) - f(r, th - dt2)) * sin(th)
                    - (f(r + dt2, th) - f(r - dt2, th)) * r * cos(th),
                    -(f(r, th + dt2) - f(r, th - dt2)) * cos(th)
                    - (f(r + dt2, th) - f(r - dt2, th)) * r * sin(th),
                    r * dt
                ).normalize();
                normals.push(vec.x, vec.y, vec.z);
            }
        }
        for (let i = 0; i < nX; i++) {
            for (let j = 0; j < nY; j++) {
                indices.push(base + i * (nY + 1) + j, base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + j);
                indices.push(base + (i + 1) * (nY + 1) + j, base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + (j + 1));
            }
        }


        // front

        base = points.length / 3;

        for (let i = 0; i <= nX; i++) {
            const th = a + i * dx;
            const r = c(th);
            vec.set(
                (c(th + dt2) - c(th - dt2)) * sin(th) + r * dt * cos(th),
                -(c(th + dt2) - c(th - dt2)) * cos(th) + r * dt * sin(th),
                0
            ).multiplyScalar(-1).normalize();
            const z0 = e(r, th);
            const z1 = f(r, th);
            for (let j = 0; j <= nX; j++) {
                points.push(
                    r * cos(th),
                    r * sin(th),
                    z0 + j / nX * (z1 - z0));
                normals.push(vec.x, vec.y, vec.z);
            }

        }
        for (let i = 0; i < nX; i++) {
            for (let j = 0; j < nX; j++) {
                indices.push(base + (i * (nX + 1) + j)
                    , base + ((i + 1) * (nX + 1) + j), base + (i * (nX + 1) + j) + 1);
                indices.push(base + ((i + 1) * (nX + 1) + j), base + ((i + 1) * (nX + 1) + j) + 1, base + (i * (nX + 1) + j) + 1);
            }
        }

        // back

        base = points.length / 3;

        for (let i = 0; i <= nX; i++) {
            const th = a + i * dx;
            const r = d(th);

            vec.set(
                (d(th + dt2) - d(th - dt2)) * sin(th) + r * dt * cos(th),
                -(d(th + dt2) - d(th - dt2)) * cos(th) + r * dt * sin(th),
                0
            ).normalize();

            const z0 = e(r, th);
            const z1 = f(r, th);

            for (let j = 0; j <= nX; j++) {
                points.push(
                    r * cos(th),
                    r * sin(th),
                    z0 + j / nX * (z1 - z0));
                normals.push(vec.x, vec.y, vec.z);
            }


        }
        for (let i = 0; i < nX; i++) {
            for (let j = 0; j < nX; j++) {
                indices.push(base + (i * (nX + 1) + j)
                    , base + ((i + 1) * (nX + 1) + j), base + (i * (nX + 1) + j) + 1);
                indices.push(base + ((i + 1) * (nX + 1) + j), base + ((i + 1) * (nX + 1) + j) + 1, base + (i * (nX + 1) + j) + 1);
            }
        }


        // right

        base = points.length / 3;
        dy = (d(a) - c(a)) / nY;
        for (let i = 0; i <= nY; i++) {
            const th = a;
            const r = c(a) + i * dy;


            const z0 = e(r, th);
            const z1 = f(r, th);

            for (let j = 0; j <= nX; j++) {
                points.push(
                    r * cos(th),
                    r * sin(th),
                    z0 + j / nX * (z1 - z0)
                );
                normals.push(sin(th), -cos(th), 0);
            }
        }
        for (let i = 0; i < nY; i++) {
            for (let j = 0; j < nX; j++) {
                indices.push(base + (i * (nX + 1) + j)
                    , base + ((i + 1) * (nX + 1) + j), base + (i * (nX + 1) + j) + 1);
                indices.push(base + ((i + 1) * (nX + 1) + j), base + ((i + 1) * (nX + 1) + j) + 1, base + (i * (nX + 1) + j) + 1);
            }
        }

        // left

        base = points.length / 3;
        dy = (d(b) - c(b)) / nY;
        for (let i = 0; i <= nY; i++) {
            const th = b;
            const r = c(b) + i * dy;

            const z0 = e(r, th);
            const z1 = f(r, th);

            for (let j = 0; j <= nX; j++) {
                points.push(
                    r * cos(th),
                    r * sin(th),
                    z0 + j / nX * (z1 - z0)
                );
                normals.push(sin(th), -cos(th), 0);
            }

        }
        for (let i = 0; i < nY; i++) {
            for (let j = 0; j < nX; j++) {
                indices.push(base + (i * (nX + 1) + j)
                    , base + ((i + 1) * (nX + 1) + j), base + (i * (nX + 1) + j) + 1);
                indices.push(base + ((i + 1) * (nX + 1) + j), base + ((i + 1) * (nX + 1) + j) + 1, base + (i * (nX + 1) + j) + 1);
            }
        }

        this.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        this.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        this.setIndex(indices);
    }
}

class SphericalSolidGeometry extends THREE.BufferGeometry {
    /**
     * 
     * @param {number} a theta lower bound
     * @param {number} b theta upper bound
     * @param {number|oneVarFunc} c phi lower
     * @param {number|oneVarFunc} d phi upper
     * @param {number|twoVarFunc} e rho lower
     * @param {number|twoVarFunc} f rho upper
     * @param {number} [nX=30] nX resolution in r direction
     * @param {number} [ny=30] ny resolution in theta direction
     */
    constructor(a, b, c, d, e, f, nX = 20, nY = 60) {
        super();

        const { sin, cos } = Math;

        const dt = 1e-4; // for computing diffs
        const dt2 = dt / 2;

        const points = [];
        const normals = [];
        const indices = [];
        const vec = new THREE.Vector3();

        const dx = (b - a) / nX;
        let dy;
        // bottom

        for (let i = 0; i <= nX; i++) {
            const th = a + i * dx;
            dy = (d(th) - c(th)) / nY;
            for (let j = 0; j <= nY; j++) {
                const ph = c(th) + j * dy;
                const r = e(th, ph);
                points.push(r * sin(ph) * cos(th), r * sin(ph) * sin(th), r * cos(ph));
                const r_th = (e(th + dt2, ph) - e(th - dt2, ph)) / dt;
                const r_ph = (e(th, ph + dt2) - e(th, ph - dt2)) / dt;

                vec.set(
                    r * (cos(th) * sin(ph) * (r * sin(ph) - cos(ph) *
                        r_ph) + sin(th) * r_th),
                    r * (sin(ph) * sin(th) * (r * sin(ph) - cos(ph) *
                        r_ph) - cos(th) * r_th),
                    r * sin(ph) * (cos(ph) * r + sin(ph) * r_ph)
                ).multiplyScalar(-1).normalize();
                normals.push(vec.x, vec.y, vec.z);
            }
        }
        for (let i = 0; i < nX; i++) {
            for (let j = 0; j < nY; j++) {
                indices.push(i * (nY + 1) + j, (i + 1) * (nY + 1) + j, i * (nY + 1) + j + 1);
                indices.push((i + 1) * (nY + 1) + j, (i + 1) * (nY + 1) + (j + 1), i * (nY + 1) + j + 1);
            }
        }

        // top

        let base = points.length / 3;

        for (let i = 0; i <= nX; i++) {
            const th = a + i * dx;
            dy = (d(th) - c(th)) / nY;
            for (let j = 0; j <= nY; j++) {
                const ph = c(th) + j * dy;
                const r = f(th, ph);
                points.push(r * sin(ph) * cos(th), r * sin(ph) * sin(th), r * cos(ph));
                const r_th = (f(th + dt2, ph) - f(th - dt2, ph)) / dt;
                const r_ph = (f(th, ph + dt2) - f(th, ph - dt2)) / dt;
                vec.set(
                    r * (cos(th) * sin(ph) * (r * sin(ph) - cos(ph) *
                        r_ph) + sin(th) * r_th),
                    r * (sin(ph) * sin(th) * (r * sin(ph) - cos(ph) *
                        r_ph) - cos(th) * r_th),
                    r * sin(ph) * (cos(ph) * r + sin(ph) * r_ph)
                ).normalize();
                normals.push(vec.x, vec.y, vec.z);
            }
        }
        for (let i = 0; i < nX; i++) {
            for (let j = 0; j < nY; j++) {
                indices.push(base + i * (nY + 1) + j, base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + j);
                indices.push(base + (i + 1) * (nY + 1) + j, base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + (j + 1));
            }
        }


        // front

        base = points.length / 3;

        for (let i = 0; i <= nX; i++) {
            const th = a + i * dx;
            const ph = c(th);
            const cp = (c(th + dt2) - c(th - dt2)) / dt;
            vec.set(
                -(cos(th) * cos(ph) * sin(ph) + sin(th) * cp),
                -sin(th) * cos(ph) * sin(ph) + cos(th) * cp,
                sin(ph) * sin(ph)
            ).normalize();

            const z0 = e(th, ph);
            const z1 = f(th, ph);

            for (let j = 0; j <= nY; j++) {
                const r = z0 + j / nY * (z1 - z0);
                points.push(
                    r * sin(ph) * cos(th),
                    r * sin(ph) * sin(th),
                    r * cos(ph));
                normals.push(vec.x, vec.y, vec.z);
            }

        }
        for (let i = 0; i < nX; i++) {
            for (let j = 0; j < nY; j++) {
                indices.push(base + i * (nY + 1) + j, base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + j);
                indices.push(base + (i + 1) * (nY + 1) + j, base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + (j + 1));
            }
        }

        // back

        base = points.length / 3;

        for (let i = 0; i <= nX; i++) {
            const th = a + i * dx;
            const ph = d(th);
            const cp = (d(th + dt2) - d(th - dt2)) / dt;
            vec.set(
                -(cos(th) * cos(ph) * sin(ph) + sin(th) * cp),
                -sin(th) * cos(ph) * sin(ph) + cos(th) * cp,
                sin(ph) * sin(ph)
            ).normalize();

            const z0 = e(th, ph);
            const z1 = f(th, ph);

            for (let j = 0; j <= nY; j++) {
                const r = z0 + j / nY * (z1 - z0);
                points.push(
                    r * sin(ph) * cos(th),
                    r * sin(ph) * sin(th),
                    r * cos(ph));
                normals.push(vec.x, vec.y, vec.z);
            }

        }
        for (let i = 0; i < nX; i++) {
            for (let j = 0; j < nY; j++) {
                indices.push(base + i * (nY + 1) + j, base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + j);
                indices.push(base + (i + 1) * (nY + 1) + j, base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + (j + 1));
            }
        }

        // right

        base = points.length / 3;
        dy = (d(a) - c(a)) / nY;
        for (let i = 0; i <= nY; i++) {
            const th = a;
            const ph = c(th) + i * dy;

            const z0 = e(th, ph);
            const z1 = f(th, ph);

            for (let j = 0; j <= nY; j++) {
                const r = z0 + j / nY * (z1 - z0);
                points.push(
                    r * sin(ph) * cos(th),
                    r * sin(ph) * sin(th),
                    r * cos(ph));
                normals.push(sin(th), -cos(th), 0);
            }

        }
        for (let i = 0; i < nY; i++) {
            for (let j = 0; j < nY; j++) {
                indices.push(base + i * (nY + 1) + j, base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + j);
                indices.push(base + (i + 1) * (nY + 1) + j, base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + (j + 1));
            }
        }

        // left

        base = points.length / 3;
        dy = (d(b) - c(b)) / nY;
        for (let i = 0; i <= nY; i++) {
            const th = b;
            const ph = c(th) + i * dy;

            const z0 = e(th, ph);
            const z1 = f(th, ph);

            for (let j = 0; j <= nY; j++) {
                const r = z0 + j / nY * (z1 - z0);
                points.push(
                    r * sin(ph) * cos(th),
                    r * sin(ph) * sin(th),
                    r * cos(ph));
                normals.push(-sin(th), cos(th), 0);
            }

        }
        for (let i = 0; i < nY; i++) {
            for (let j = 0; j < nY; j++) {
                indices.push(base + i * (nY + 1) + j, base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + j);
                indices.push(base + (i + 1) * (nY + 1) + j, base + i * (nY + 1) + j + 1, base + (i + 1) * (nY + 1) + (j + 1));
            }
        }

        this.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        this.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        this.setIndex(indices);
    }
}

/**
 * Converts output of `evaluate_cmap` to HTML #rrggbb string.
 * @param {int[3]} vec 
 * @returns {string}
 */
function tripleToHex(vec) {
    const [r, g, b] = vec;
    return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** 
 * @callback FieldFunction
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {Array<number>[3]}
 */

class FluxBoxGeometry extends THREE.BufferGeometry {
    /**
     * Produce a geometry of parallelopipeds from a flux integral. Divide each direction into N pieces, Use a frame of r_u, r_v, and F as the edges of each parallelopiped. 
     * @param {FieldFunction} F - vector field
     * @param {function} r - parametric surface
     * @param {number} a - lower u
     * @param {number} b - upper u
     * @param {number|function} c - lower v
     * @param {number|function} d - upper v
     * @param {int} N - resolution
     * @param {boolean} shards - only show tangent pieces (e.g., for surface area)
     * @param {number} [t=1] - scale factor for vector field
     * @param {string} [sided = 'pos'] - which side to draw boxes on (one of 'pos', 'neg', or 'both')
     * @param {number} [s = 0.5] - sample point parameter (0 SW to 1 NE)
     */
    constructor(F, r, a, b, c, d, N = 10, shards = false, t = 1, sided = 'pos', s = 0.5) {
        super();

        // track the (signed volume to approximate the net flux)
        this.volume = 0;

        t = shards ? 0 : t;
        const dt = 1e-4; // for computing diffs
        const dt2 = dt / 2;

        // save values for adjusting height in F direction
        this.lastT = t;
        this.lastN = N;
        this.lastF = [];

        const points = [];
        const normals = [];

        const du = (b - a) / N;
        let dv;

        const normal = new THREE.Vector3();

        for (let i = 0; i < N; i++) {
            const u = a + (i + s) * du;
            dv = (d(u) - c(u)) / N;
            for (let j = 0; j < N; j++) {
                const v = c(u) + (j + s) * dv;
                let [x, y, z] = r(u, v);
                const [xu1, yu1, zu1] = r(u + dt2, v);
                const [xu0, yu0, zu0] = r(u - dt2, v);
                const ru = new THREE.Vector3((xu1 - xu0) / dt, (yu1 - yu0) / dt, (zu1 - zu0) / dt);
                const [xv1, yv1, zv1] = r(u, v + dt2);
                const [xv0, yv0, zv0] = r(u, v - dt2);
                const rv = new THREE.Vector3((xv1 - xv0) / dt, (yv1 - yv0) / dt, (zv1 - zv0) / dt);

                // separate top and bottom for z-fighting on zeros of F.
                // const tol = 1e-3;

                // adjust for sample point
                x -= (du * ru.x + dv * rv.x) * s;
                y -= (du * ru.y + dv * rv.y) * s;
                z -= (du * ru.z + dv * rv.z) * s;

                const f = new THREE.Vector3(...F(x, y, z));

                normal.copy(ru.clone().cross(rv));
                this.volume += f.dot(normal) * du * dv;
                normal.normalize();

                if (sided === 'both' || (sided === 'pos' && normal.dot(f) >= 0) || (sided === 'neg' && normal.dot(f) < 0)) {

                    this.lastF.push(f.x, f.y, f.z);


                    // top

                    points.push(x + t * f.x, y + t * f.y, z + t * f.z);
                    points.push(x + t * f.x + du * ru.x, y + t * f.y + du * ru.y, z + t * f.z + du * ru.z);
                    points.push(x + t * f.x + dv * rv.x, y + t * f.y + dv * rv.y, z + t * f.z + dv * rv.z);
                    points.push(x + t * f.x + du * ru.x, y + t * f.y + du * ru.y, z + t * f.z + du * ru.z);
                    points.push(x + t * f.x + du * ru.x + dv * rv.x, y + t * f.y + du * ru.y + dv * rv.y, z + t * f.z + du * ru.z + dv * rv.z);
                    points.push(x + t * f.x + dv * rv.x, y + t * f.y + dv * rv.y, z + t * f.z + dv * rv.z);

                    for (let index = 0; index < 6; index++) normals.push(normal.x, normal.y, normal.z);
                    if (!shards) {
                        // bottom

                        points.push(x + du * ru.x, y + du * ru.y, z + du * ru.z);
                        points.push(x, y, z);
                        points.push(x + dv * rv.x, y + dv * rv.y, z + dv * rv.z);
                        points.push(x + du * ru.x, y + du * ru.y, z + du * ru.z);
                        points.push(x + dv * rv.x, y + dv * rv.y, z + dv * rv.z);
                        points.push(x + du * ru.x + dv * rv.x, y + du * ru.y + dv * rv.y, z + du * ru.z + dv * rv.z);

                        for (let index = 0; index < 6; index++) normals.push(-normal.x, -normal.y, -normal.z);



                        // front

                        normal.copy(ru.clone().cross(f).normalize());
                        points.push(x, y, z);
                        points.push(x + du * ru.x, y + du * ru.y, z + du * ru.z);
                        points.push(x + t * f.x, y + t * f.y, z + t * f.z);
                        points.push(x + du * ru.x, y + du * ru.y, z + du * ru.z);
                        points.push(x + du * ru.x + t * f.x, y + du * ru.y + t * f.y, z + du * ru.z + t * f.z);
                        points.push(x + t * f.x, y + t * f.y, z + t * f.z);

                        for (let index = 0; index < 6; index++) normals.push(-normal.x, -normal.y, -normal.z);

                        // back

                        points.push(x + dv * rv.x + du * ru.x, y + dv * rv.y + du * ru.y, z + dv * rv.z + du * ru.z);
                        points.push(x + dv * rv.x, y + dv * rv.y, z + dv * rv.z);
                        points.push(x + dv * rv.x + t * f.x, y + dv * rv.y + t * f.y, z + dv * rv.z + t * f.z);
                        points.push(x + dv * rv.x + du * ru.x + t * f.x, y + dv * rv.y + du * ru.y + t * f.y, z + du * ru.z + t * f.z + dv * rv.z);
                        points.push(x + dv * rv.x + du * ru.x, y + dv * rv.y + du * ru.y, z + dv * rv.z + du * ru.z);
                        points.push(x + dv * rv.x + t * f.x, y + dv * rv.y + t * f.y, z + dv * rv.z + t * f.z);

                        for (let index = 0; index < 6; index++) normals.push(normal.x, normal.y, normal.z);

                        // left

                        normal.copy(f.clone().cross(rv).normalize());
                        points.push(x, y, z);
                        points.push(x + t * f.x, y + t * f.y, z + t * f.z);
                        points.push(x + t * f.x + dv * rv.x, y + t * f.y + dv * rv.y, z + t * f.z + dv * rv.z);
                        points.push(x, y, z);
                        points.push(x + t * f.x + dv * rv.x, y + t * f.y + dv * rv.y, z + t * f.z + dv * rv.z);
                        points.push(x + dv * rv.x, y + dv * rv.y, z + dv * rv.z);

                        for (let index = 0; index < 6; index++) normals.push(normal.x, normal.y, normal.z);

                        // right

                        points.push(x + du * ru.x + t * f.x, y + du * ru.y + t * f.y, z + du * ru.z + t * f.z);
                        points.push(x + du * ru.x, y + du * ru.y, z + du * ru.z);
                        points.push(x + du * ru.x + t * f.x + dv * rv.x, y + du * ru.y + t * f.y + dv * rv.y, z + du * ru.z + t * f.z + dv * rv.z);
                        points.push(x + du * ru.x + t * f.x + dv * rv.x, y + du * ru.y + t * f.y + dv * rv.y, z + du * ru.z + t * f.z + dv * rv.z);
                        points.push(x + du * ru.x, y + du * ru.y, z + du * ru.z);
                        points.push(x + du * ru.x + dv * rv.x, y + du * ru.y + dv * rv.y, z + du * ru.z + dv * rv.z);

                        for (let index = 0; index < 6; index++) normals.push(-normal.x, -normal.y, -normal.z);
                    }

                }

            }
        }


        this.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        this.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }

    /**
     * scale the edge in the vector field direction
     * @param {number} t - new time
     */
    changeT(t) {

        const points = this.attributes.position.array;
        // console.log("changing T", points.length);

        const dt = t - this.lastT;
        const N = points.length / 108;
        const Fs = this.lastF;

        // where the "top" vertices are located
        const topIndices = [0, 1, 2, 3, 4, 5, 14, 16, 17, 20, 21, 23, 25, 26, 28, 30, 32, 33];

        for (let i = 0; i < N; i++) {
            const [fx, fy, fz] = Fs.slice((i) * 3, (i + 1) * 3);

            //         // top
            for (let k = 0; k < topIndices.length; k++) {
                const pIndex = 3 * (topIndices[k] + 36 * (i));
                // console.log(i, j, k, N, topIndices[k], pIndex);
                points[pIndex] += dt * fx;
                points[pIndex + 1] += dt * fy;
                points[pIndex + 2] += dt * fz;

            }

        }
        this.lastT = t;
        this.attributes.position.needsUpdate = true;

    }
}

class FluxBoxEdgesGeometry extends THREE.BufferGeometry {
    /**
     * Produce a geometry of parallelopipeds from a flux integral. Divide each direction into N pieces, Use a frame of r_u, r_v, and F as the edges of each parallelopiped. 
     * @param {FluxBoxGeometry} geo - vector field
     * @param {boolean=false} shards - only show tangent pieces (e.g., for surface area)
     * @param {number=1} t - scaling factor for vector field
     */
    constructor(geo, shards = false, t = 1) {
        super();

        const points = geo.attributes.position.array;

        t = shards ? 0 : t;


        // save values for adjusting height in F direction
        this.lastT = t;
        const N = points.length / 108;
        const Fs = geo.lastF;

        const vertices = [];
        for (let pointIndex = 0; pointIndex < N; pointIndex++) {
            // for (let j = 0; j < N; j++) {
            // const pointIndex = i * N + j;
            const A = points.slice(pointIndex * 108 + 21, pointIndex * 108 + 24);
            const B = points.slice(pointIndex * 108 + 18, pointIndex * 108 + 21);
            const C = points.slice(pointIndex * 108 + 33, pointIndex * 108 + 36);
            const D = points.slice(pointIndex * 108 + 24, pointIndex * 108 + 27);

            const [fx, fy, fz] = Fs.slice((pointIndex) * 3, (pointIndex + 1) * 3);

            // 12 edges
            vertices.push(...A, ...B);
            vertices.push(...B, ...C);
            vertices.push(...C, ...D);
            vertices.push(...D, ...A);

            if (!shards && t > 0) {
                vertices.push(...A, A[0] + t * fx, A[1] + t * fy, A[2] + t * fz);
                vertices.push(...B, B[0] + t * fx, B[1] + t * fy, B[2] + t * fz);
                vertices.push(...C, C[0] + t * fx, C[1] + t * fy, C[2] + t * fz);
                vertices.push(...D, D[0] + t * fx, D[1] + t * fy, D[2] + t * fz);

                vertices.push(B[0] + t * fx, B[1] + t * fy, B[2] + t * fz, A[0] + t * fx, A[1] + t * fy, A[2] + t * fz);
                vertices.push(C[0] + t * fx, C[1] + t * fy, C[2] + t * fz, B[0] + t * fx, B[1] + t * fy, B[2] + t * fz);
                vertices.push(D[0] + t * fx, D[1] + t * fy, D[2] + t * fz, C[0] + t * fx, C[1] + t * fy, C[2] + t * fz);
                vertices.push(A[0] + t * fx, A[1] + t * fy, A[2] + t * fz, D[0] + t * fx, D[1] + t * fy, D[2] + t * fz);
            }
            // }
        }


        this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    }

    /**
     * scale the edge in the vector field direction
     * @param {number} t - new time
     */
    changeT(t) {
        this.lastT = t;
        this.attributes.position.needsUpdate = true;

    }
}

class ShardsGeometry extends THREE.BufferGeometry {
    /**
     * Produce a geometry of parallelograms tangent to a surface. Divide each direction into N pieces, Use a frame of r_u and r_v as the edges of each parallelogram. 
     * @param {function} r - parametric surface
     * @param {number} a - lower u
     * @param {number} b - upper u
     * @param {number|function} c - lower v
     * @param {number|function} d - upper v
     * @param {int} N - resolution
     * @param {number} [s = 0.5] - sample point parameter (0 SW to 1 NE)
     */
    constructor(r, a, b, c, d, N = 10, s = 0.5) {
        super();

        this.area = 0;

        const dt = 1e-4; // for computing diffs
        const dt2 = dt / 2;

        const points = [];
        const normals = [];

        const du = (b - a) / N;
        let dv;

        const normal = new THREE.Vector3();

        for (let i = 0; i < N; i++) {
            const u = a + (i + s) * du;
            dv = (d(u) - c(u)) / N;
            for (let j = 0; j < N; j++) {
                const v = c(u) + (j + s) * dv;
                let [x, y, z] = r(u, v);
                const [xu1, yu1, zu1] = r(u + dt2, v);
                const [xu0, yu0, zu0] = r(u - dt2, v);
                const ru = new THREE.Vector3((xu1 - xu0) / dt, (yu1 - yu0) / dt, (zu1 - zu0) / dt);
                const [xv1, yv1, zv1] = r(u, v + dt2);
                const [xv0, yv0, zv0] = r(u, v - dt2);
                const rv = new THREE.Vector3((xv1 - xv0) / dt, (yv1 - yv0) / dt, (zv1 - zv0) / dt);

                normal.copy(ru.clone().cross(rv));
                this.area += normal.length() * du * dv;
                normal.normalize();

                // const tol = 1e-3; // perturb position for z-fighting

                // adjust for sample point
                x -= (du * ru.x + dv * rv.x) * s;
                y -= (du * ru.y + dv * rv.y) * s;
                z -= (du * ru.z + dv * rv.z) * s;

                // top

                points.push(x, y, z);
                points.push(x + du * ru.x, y + du * ru.y, z + du * ru.z);
                points.push(x + dv * rv.x, y + dv * rv.y, z + dv * rv.z);
                points.push(x + du * ru.x, y + du * ru.y, z + du * ru.z);
                points.push(x + du * ru.x + dv * rv.x, y + du * ru.y + dv * rv.y, z + du * ru.z + dv * rv.z);
                points.push(x + dv * rv.x, y + dv * rv.y, z + dv * rv.z);

                for (let index = 0; index < 6; index++) { normals.push(normal.x, normal.y, normal.z); }
            }

        }

        this.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        this.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }


}

class ShardsEdgesGeometry extends THREE.BufferGeometry {
    /**
     * Produce a geometry of parallelopipeds from a flux integral. Divide each direction into N pieces, Use a frame of r_u, r_v, and F as the edges of each parallelopiped. 
     * @param {ShardsGeometry} geo - Geometry to outline
     */
    constructor(geo) {
        super();

        const points = geo.attributes.position.array;

        const N = points.length / 18;

        const vertices = [];
        for (let pointIndex = 0; pointIndex < N; pointIndex++) {
            // for (let j = 0; j < N; j++) {
            // const pointIndex = i * N + j;
            const A = points.slice(pointIndex * 18 + 0, pointIndex * 18 + 3);
            const B = points.slice(pointIndex * 18 + 3, pointIndex * 18 + 6);
            const C = points.slice(pointIndex * 18 + 12, pointIndex * 18 + 15);
            const D = points.slice(pointIndex * 18 + 9, pointIndex * 18 + 12);



            // 4 edges
            vertices.push(...A, ...B);
            vertices.push(...B, ...C);
            vertices.push(...C, ...D);
            vertices.push(...D, ...A);
        }


        this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    }

    /**
     * scale the edge in the vector field direction
     * @param {number} t - new time
     */
    changeT(t) {
        this.lastT = t;
        this.attributes.position.needsUpdate = true;

    }
}

/**
 * 
 * @param {int} x 
 * @returns {strint} 2 character hex code for int
 */
const hex = (x) => {
    let str = x.toString(16);
    if (str.length < 2) {
        return '0' + str;
    } else {
        return str;
    }
};



/**
 * Good ol' l2 norm
 * @param  {...Number[]} v - array of values
 * @returns {Number} the (l2) magnitude of v
 */
const norm2 = (...v) => {
    const tot = v.reduce((x, y) => x + y * y, 0);
    return Math.sqrt(tot);
};

/**
 * exponential function for scale (log10) values
 * @param {Number} scale 
 * @returns {Number} approximate exponential for scaling axes
 */
const scaleExp = (scale) => Math.round(
    100 *
    Math.pow(10, Math.floor(scale)) *
    Math.floor(
        Math.pow(10, scale) /
        Math.pow(10, Math.floor(scale))
    )
) / 100;

export {
    norm2,
    joinUrl,
    getRoomUrl,
    convertToURLParams,
    processSearchEncoding,
    ArrowBufferGeometry,
    ParametricCurve,
    drawGrid,
    drawAxes,
    labelAxes,
    gaussLegendre,
    isDependentOn,
    rk4,
    norm1,
    lcm,
    disposeArray,
    freeChildren,
    adjustArrowHeight,
    ParametricGeometry,
    RectangularSolidGeometry,
    CylindricalSolidGeometry,
    SphericalSolidGeometry,
    FluxBoxGeometry,
    FluxBoxEdgesGeometry,
    ShardsGeometry,
    ShardsEdgesGeometry,
    nextHue,
    makeHSLColor,
    blockGeometry,
    forceNumber,
    querySelectorIncludesText,
    checksum,
    modFloor,
    tripleToHex,
    scaleExp,
};
