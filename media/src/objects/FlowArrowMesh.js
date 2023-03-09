import * as THREE from 'three';
import { rk4, norm1 } from '../utils.js';

export default class FlowArrowMesh extends THREE.Mesh {
    constructor(geometry, material, lim = 1) {
        super(geometry, material);

        this.start = new THREE.Vector3();
        this.lim = lim;
        this.lastPosition = null;
    }

    initiate(F, dt = 0.01, maxSteps = 500, tol = 1e-3) {
        const vec = new THREE.Vector3();
        const vec1 = new THREE.Vector3();
        vec.copy(this.position);
        for (let i = 0; i < maxSteps; i++) {
            vec1.set(...rk4(vec.x, vec.y, vec.z, F, -dt));
            if (vec.clone().sub(vec1).length() < tol * this.lim) {
                return this.start.copy(vec1);
            } else {
                if (norm1(vec1) > this.lim) {
                    return this.start.copy(vec);
                }
            }
            vec.copy(vec1);
        }
        return this.start.copy(vec1);
    }
}
