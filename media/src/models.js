class GraphFunc {
    constructor (f='cos(2*x + 2*y)/(1 + x^2 + y^2)', rangeX=[-2, 2],
                 rangeY=[-2, 2], meshX=10, meshY=10, res=30,
                 lvlUp=true, viewGraph=true, rangeT=[0, 2], tangents=false,
                 color='#000000', integrate=false, n=1, sample=0) {
        this.f = f;
        this.rangeX = rangeX;
        this.rangeY = rangeY;
        this.meshX = meshX;
        this.meshY = meshY;
        this.res = res;
        this.lvlUp = lvlUp;
        this.viewGraph = viewGraph;
        this.rangeT = rangeT;
        this.tangents = tangents;
        this.color = color;
        this.integrate = integrate;
        this.n = n;
        this.sample = sample;
    }
}

class LevelSurface {
    constructor (g='x^2 + y^2 - z^2', k=1, rangeX=[-2,2], rangeY=[-2, 2],
                 rangeZ=[-2, 2], tangents=false) {
        this.g = g;
        this.k = k;
        this.rangeX = rangeX;
        this.rangeY = rangeY;
        this.rangeZ = rangeZ;
        this.tangents = tangents;
    }
}

class Message {
    constructor(message, user, objectList=[]) {
        this.message = message;
        this.user = user;
        this.objects = Array.isArray(objectList) ? objectList : [objectList];
        this.time = Date.now();
    }
}

class ParametricSurface {
    constructor (x='cos(u)*(1 + sin(v)/3)', y='sin(u)*(1 + sin(v)/3)',
                 z='cos(v)/3', rangeU=['0', '2*pi'], rangeV=['0', '2*pi'],
                 meshU=10, meshV=10, res=30) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.rangeU = rangeU;
        this.rangeV = rangeV;
        this.meshU = meshU;
        this.meshV = meshV;
        this.res = res;
    }
}

/**
 * A basic container for holding and sorting responses.
 */
class ResponseList {
    constructor (id, list) {
        this.list = Array.isArray(list) ? list : [list];
        this.id = id;
        this.desc = false;
        this.sortType = 'time';
    }

    propsCompare(props) {
        return function(a,b) {
            return (typeof a[props] === 'string') ?
                a[props].localeCompare(b[props]) :
                a[props] - b[props];
        };
    }

    /**
     * It can be assumed that the initial list is sorted chronologically in
     * the order that responses were received.
     * @param {*} type The sorting type as a string: time, user
     * @param {*} desc The sort direction; either ascending or descending
     * @returns Sorted array of Message objects
     */
    sortBy (type = 'time', desc = false) {
        const validSort = ['time', 'user'];
        if (type === this.sortType && desc === this.desc) {
            return;
        } if (validSort.includes(type)) {
            this.list.sort(this.propsCompare(type));
            if (desc) {
                this.list.reverse();
            }
            this.sortType = type;
            this.desc = desc;
        } else {
            try {
                throw new Error('Invalid sort parameter');
            } catch (err) {
                console.error(err);
            }
        }
    }
}

class SpaceCurve {
    constructor (xT='cos(t)', yT='sin(t)', zT='cos(9*t)', range=['0', '2*pi'],
                 frame=false, repS = false, circle=false, color='#000000', ) {
        this.xT = xT;
        this.yT = yT;
        this.zT = zT;
        this.range = range;
        this.frame = frame;
        this.repS = repS;
        this.circle = circle;
        this.color = color;
    }
}

class Vector {
    constructor (x=1, y=1, z=1, posX=0, posY=0, posZ=0, scale=1, color='#000000') {
        this.x = x;
        this.y = y;
        this.z = z;
        this.posX = posX;
        this.posY = posY;
        this.posZ = posZ;
        this.scale = scale;
        this.color = color;
    }
}

class VectorField {
    constructor (p='x', q='y', r='-z', res=5, trails=true) {
        this.p = p;
        this.q = q;
        this.r = r;
        this.res = res;
        this.trails = trails;
    }
}

export { GraphFunc, LevelSurface, Message, ParametricSurface,
         ResponseList, SpaceCurve, Vector, VectorField };
