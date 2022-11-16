import assert from 'assert';
import {
    GraphFunc,
    LevelSurface,
    Message,
    ParametricSurface,
    ResponseList,
    SpaceCurve,
    Vector,
    VectorField
} from '../src/models.js';


describe('GraphFunc', function() {
    it('Should make a proper default GraphFunc',
        function() {
            const graphFunc = new GraphFunc();
            assert.deepEqual(graphFunc.f, 'cos(2*x + 2*y)/(1 + x^2 + y^2)');
            assert.deepEqual(graphFunc.rangeX, [-2, 2]);
            assert.deepEqual(graphFunc.rangeY, [-2, 2]);
            assert.deepEqual(graphFunc.meshX, 10);
            assert.deepEqual(graphFunc.meshY, 10);
            assert.deepEqual(graphFunc.res, 30);
            assert.ok(graphFunc.lvlUp);
            assert.ok(graphFunc.viewGraph);
            assert.deepEqual(graphFunc.rangeT, [0, 2]);
            assert.ok(!graphFunc.tangents);
            assert.deepEqual(graphFunc.color, '#000000');
            assert.ok(!graphFunc.integrate);
            assert.deepEqual(graphFunc.n, 1);
            assert.deepEqual(graphFunc.sample, 0);
        });
    it('Should make a proper GraphFunc',
        function() {
            const graphFunc = new GraphFunc(
                'sin(x^2) + cos(y^2)', [1, 3], [4, 9], 5, 7, 24, false, false,
                [1, 15], true, '#00cc00', true, 5, 3);
            assert.deepEqual(graphFunc.f, 'sin(x^2) + cos(y^2)');
            assert.deepEqual(graphFunc.rangeX, [1, 3]);
            assert.deepEqual(graphFunc.rangeY, [4, 9]);
            assert.deepEqual(graphFunc.meshX, 5);
            assert.deepEqual(graphFunc.meshY, 7);
            assert.deepEqual(graphFunc.res, 24);
            assert.ok(!graphFunc.lvlUp);
            assert.ok(!graphFunc.viewGraph);
            assert.deepEqual(graphFunc.rangeT, [1, 15]);
            assert.ok(graphFunc.tangents);
            assert.deepEqual(graphFunc.color, '#00cc00');
            assert.ok(graphFunc.integrate);
            assert.deepEqual(graphFunc.n, 5);
            assert.deepEqual(graphFunc.sample, 3);
        });
});


describe('LevelSurface', function() {
    it('Should make a proper default LevelSurface',
        function() {
            const graphFunc = new LevelSurface();
            assert.deepEqual(graphFunc.g, 'x^2 + y^2 - z^2');
            assert.deepEqual(graphFunc.k, 1);
            assert.deepEqual(graphFunc.rangeX, [-2, 2]);
            assert.deepEqual(graphFunc.rangeY, [-2, 2]);
            assert.deepEqual(graphFunc.rangeZ, [-2, 2]);
            assert.ok(!graphFunc.tangents);
        });
    it('Should make a proper LevelSurface',
        function() {
            const graphFunc = new LevelSurface('x^2 + y^3 + z^2', 3, [0, 4],
                                               [-2, 6], [-1, 5], true);
            assert.deepEqual(graphFunc.g, 'x^2 + y^3 + z^2');
            assert.deepEqual(graphFunc.k, 3);
            assert.deepEqual(graphFunc.rangeX, [0, 4]);
            assert.deepEqual(graphFunc.rangeY, [-2, 6]);
            assert.deepEqual(graphFunc.rangeZ, [-1, 5]);
            assert.ok(graphFunc.tangents);
        });
});


describe('Message', function() {
    it('Shoud make a proper default Message',
        function() {
            const message = new Message();
            assert.deepEqual(message['message'], null);
            assert.deepEqual(message['user'], null);
            assert.deepEqual(message['objects'], []);
            assert.ok(Number.isInteger(message['time']));
        });
    it('Shoud make a proper Message with a default empty object list',
        function() {
            const message = new Message('Hello', 'Tester');
            assert.deepEqual(message['message'], 'Hello');
            assert.deepEqual(message['user'], 'Tester');
            assert.deepEqual(message['objects'], []);
            assert.ok(Number.isInteger(message['time']));
        });
    it('Shoud make a proper Message',
        function() {
            const message = new Message('Hello', 'Tester', [
                new VectorField('a', 'b', 'c', 2, false),
                new Vector(1, 2, 3, 4, 5, 6, 7, '#bedfed'),
                new LevelSurface('x + y + z', 3, [-3, 3], [-1, 1], [-4, 4],
                                 false)
            ]);
            assert.deepEqual(message['message'], 'Hello');
            assert.deepEqual(message['user'], 'Tester');
            assert.deepEqual(message['objects'].length, 3);
            assert.deepEqual(message['objects'], [
                new VectorField('a', 'b', 'c', 2, false),
                new Vector(1, 2, 3, 4, 5, 6, 7, '#bedfed'),
                new LevelSurface('x + y + z', 3, [-3, 3], [-1, 1], [-4, 4],
                                 false)
            ])
            assert.ok(Number.isInteger(message['time']));
        });
});


describe('ParametricSurface', function() {
    it('Should make a proper default ParametricSurface',
        function() {
            const graphFunc = new ParametricSurface();
            assert.deepEqual(graphFunc.x, 'cos(u)*(1 + sin(v)/3)');
            assert.deepEqual(graphFunc.y, 'sin(u)*(1 + sin(v)/3)');
            assert.deepEqual(graphFunc.z, 'cos(v)/3');
            assert.deepEqual(graphFunc.rangeU, ['0', '2*pi']);
            assert.deepEqual(graphFunc.rangeV, ['0', '2*pi']);
            assert.deepEqual(graphFunc.meshU, 10);
            assert.deepEqual(graphFunc.meshV, 10);
            assert.deepEqual(graphFunc.res, 30);
        });
    it('Should make a proper ParametricSurface',
        function() {
            const graphFunc = new ParametricSurface(
                'cos(u)*sin(v)', 'cos(u)*sin(v)', 'cos(v)', ['pi/4', 'pi'],
                ['pi/4', 'pi'], 5, 5, 24
            );
            assert.deepEqual(graphFunc.x, 'cos(u)*sin(v)');
            assert.deepEqual(graphFunc.y, 'cos(u)*sin(v)');
            assert.deepEqual(graphFunc.z, 'cos(v)');
            assert.deepEqual(graphFunc.rangeU, ['pi/4', 'pi']);
            assert.deepEqual(graphFunc.rangeV, ['pi/4', 'pi']);
            assert.deepEqual(graphFunc.meshU, 5);
            assert.deepEqual(graphFunc.meshV, 5);
            assert.deepEqual(graphFunc.res, 24);
        });
});


describe('ResponseList', function() {
    it('Should make a proper ResponseList',
        function() {
            const reList = new ResponseList('tester',[
                new Message('Hello', 'qwerty'),
                new Message('Greetings', 'asdfg'),
                new Message('Salutations', 'zxcvb')
            ]);
            assert.deepEqual(reList.id, 'tester');
            assert.ok(Array.isArray(reList.list));
            assert.ok(reList.desc === false);
            assert.ok(reList.sortType === 'time');
        });
    it('sortBy() should throw an error with bad parameters',
        function() {
            const reList = new ResponseList('tester', [
                new Message('Hello', 'qwerty'),
                new Message('Greetings', 'asdfg', [1, 2]),
                new Message('Salutations', 'zxcvb', [1])
            ]);
            try {
                reList.sortBy('none');
            } catch (err) {
                assert.deepEqual(err.message, 'Invalid sort parameter');
            }
        });
    it('Handles an empty list',
        function() {
            const reList = new ResponseList('tester',[]);
            reList.sortBy();
            assert.deepEqual(reList.list, []);
        });
    it('Should use the default sort time, ascending',
        function() {
            const reList = new ResponseList('tester', [
                new Message('Hello', 'qwerty'),
                new Message('Greetings', 'asdfg', [1, 2]),
                new Message('Salutations', 'zxcvb', [1]),
                new Message('Hi', 'poiuy', []),
                new Message('Good day', 'lkhjg', [2, 4]),
                new Message('Hey', 'nmbvc', [1, 3, 5])
            ]);
            reList.sortBy();
            assert.deepEqual(reList.list[0].message, 'Hello');
            assert.deepEqual(reList.list[1].message, 'Greetings');
            assert.deepEqual(reList.list[2].message, 'Salutations');
            assert.deepEqual(reList.list[3].message, 'Hi');
            assert.deepEqual(reList.list[4].message, 'Good day');
            assert.deepEqual(reList.list[5].message, 'Hey');
        });
    it('Should sort an array of Messages by user, ascending',
        function() {
            const reList = new ResponseList('tester', [
                new Message('Hello', 'qwerty'),
                new Message('Greetings', 'asdfg', [1, 2]),
                new Message('Salutations', 'zxcvb', [1]),
                new Message('Hi', 'poiuy', []),
                new Message('Good day', 'lkhjg', [2, 4]),
                new Message('Hey', 'nmbvc', [1, 3, 5])
            ]);
            reList.sortBy('user');
            assert.deepEqual(reList.list[0].message, 'Greetings');
            assert.deepEqual(reList.list[1].message, 'Good day');
            assert.deepEqual(reList.list[2].message, 'Hey');
            assert.deepEqual(reList.list[3].message, 'Hi');
            assert.deepEqual(reList.list[4].message, 'Hello');
            assert.deepEqual(reList.list[5].message, 'Salutations');
        });
    it('Should sort an array of Messages by user, descending',
        function() {
            const reList = new ResponseList('tester', [
                new Message('Hello', 'qwerty'),
                new Message('Greetings', 'asdfg', [1, 2]),
                new Message('Salutations', 'zxcvb', [1]),
                new Message('Hi', 'poiuy', []),
                new Message('Good day', 'lkhjg', [2, 4]),
                new Message('Hey', 'nmbvc', [1, 3, 5])
            ]);
            reList.sortBy('user', true);
            assert.deepEqual(reList.list[0].message, 'Salutations');
            assert.deepEqual(reList.list[1].message, 'Hello');
            assert.deepEqual(reList.list[2].message, 'Hi');
            assert.deepEqual(reList.list[3].message, 'Hey');
            assert.deepEqual(reList.list[4].message, 'Good day');
            assert.deepEqual(reList.list[5].message, 'Greetings');
        });
});


describe('SpaceCurve', function() {
    it('Should make a proper default SpaceCurve',
        function() {
            const graphFunc = new SpaceCurve();
            assert.deepEqual(graphFunc.xT, 'cos(t)');
            assert.deepEqual(graphFunc.yT, 'sin(t)');
            assert.deepEqual(graphFunc.zT, 'cos(9*t)');
            assert.deepEqual(graphFunc.range, ['0', '2*pi']);
            assert.ok(!graphFunc.frame);
            assert.ok(!graphFunc.repS);
            assert.ok(!graphFunc.circle);
            assert.deepEqual(graphFunc.color, '#000000');
        });
    it('Should make a proper SpaceCurve',
        function() {
            const graphFunc = new SpaceCurve(
                '2*cos(t)', '2*sin(t)', '2*cos(9*t)', ['-pi', 'pi'], true,
                true, true, '#bedfed');
            assert.deepEqual(graphFunc.xT, '2*cos(t)');
            assert.deepEqual(graphFunc.yT, '2*sin(t)');
            assert.deepEqual(graphFunc.zT, '2*cos(9*t)');
            assert.deepEqual(graphFunc.range, ['-pi', 'pi']);
            assert.ok(graphFunc.frame);
            assert.ok(graphFunc.repS);
            assert.ok(graphFunc.circle);
            assert.deepEqual(graphFunc.color, '#bedfed');
        });
});


describe('Vector', function() {
    it('Should make a proper default Vector',
        function() {
            const graphFunc = new Vector();
            assert.deepEqual(graphFunc.x, 1);
            assert.deepEqual(graphFunc.y, 1);
            assert.deepEqual(graphFunc.z, 1);
            assert.deepEqual(graphFunc.posX, 0);
            assert.deepEqual(graphFunc.posY, 0);
            assert.deepEqual(graphFunc.posZ, 0);
            assert.deepEqual(graphFunc.scale, 1);
            assert.deepEqual(graphFunc.color, '#000000');
        });
    it('Should make a proper Vector',
        function() {
            const graphFunc = new Vector(1, 2, 3, -1, 0, 1, 3, '#bedfed');
            assert.deepEqual(graphFunc.x, 1);
            assert.deepEqual(graphFunc.y, 2);
            assert.deepEqual(graphFunc.z, 3);
            assert.deepEqual(graphFunc.posX, -1);
            assert.deepEqual(graphFunc.posY, 0);
            assert.deepEqual(graphFunc.posZ, 1);
            assert.deepEqual(graphFunc.scale, 3);
            assert.deepEqual(graphFunc.color, '#bedfed');
        });
});


describe('VectorField', function() {
    it('Should make a proper default VectorField',
        function() {
            const graphFunc = new VectorField();
            assert.deepEqual(graphFunc.p, 'x');
            assert.deepEqual(graphFunc.q, 'y');
            assert.deepEqual(graphFunc.r, '-z');
            assert.deepEqual(graphFunc.res, 5);
            assert.ok(graphFunc.trails);
        });
    it('Should make a proper VectorField',
        function() {
            const graphFunc = new VectorField('a', 'b', '-c', 8, true);
            assert.deepEqual(graphFunc.p, 'a');
            assert.deepEqual(graphFunc.q, 'b');
            assert.deepEqual(graphFunc.r, '-c');
            assert.deepEqual(graphFunc.res, 8);
            assert.ok(graphFunc.trails);
        });
});
