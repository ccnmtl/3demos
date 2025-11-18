import * as THREE from 'three';
import { rk4, norm1 } from '../utils.js';

export default class FlowArrowMesh extends THREE.Mesh {
    constructor(
        geometry,
        material,
        lim = { x0: -1, x1: 1, y0: 1, y1: 1, z0: -1, z1: 1, ds: 0.5 }
    ) {
        super(geometry, material);

        this.start = new THREE.Vector3();
        this.lim = lim;
        this.lastPosition = null;
    }

    initiate(F, dt = 0.01, maxSteps = 500, tol = 1e-4) {
        const vec = new THREE.Vector3();
        const vec1 = new THREE.Vector3();
        vec.copy(this.position);
        for (let i = 0; i < maxSteps; i++) {
            vec1.set(...rk4(vec.x, vec.y, vec.z, F, -dt));
            if (vec.clone().sub(vec1).length() < tol * this.lim.ds) {
                return this.start.copy(vec1);
            } else {
                if (
                    vec1.x < this.lim.x0 - this.lim.ds / 2 ||
                    vec1.x > this.lim.x1 + this.lim.ds / 2 ||
                    vec1.y < this.lim.y0 - this.lim.ds / 2 ||
                    vec1.y > this.lim.y1 + this.lim.ds / 2 ||
                    vec1.z < this.lim.z0 - this.lim.ds / 2 ||
                    vec1.z > this.lim.z1 + this.lim.ds / 2
                ) {
                    return this.start.copy(vec);
                }
            }
            vec.copy(vec1);
        }
        return this.start.copy(vec1);
    }
}
