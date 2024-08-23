(function(factory) {
    typeof define === 'function' && define.amd ? define(factory) :
        factory();
})((function() {
    'use strict';

    // Selectors for preselecting elements to be checked
    const SELECTORS = [
        'a:not(:has(img))',
        'a img',
        'button',
        'input:not([type="hidden"])',
        'select',
        'textarea',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]',
        '.btn',
        '[role="button"]',
        '[role="link"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="input"]',
        '[role="menuitem"]',
        '[role="menuitemcheckbox"]',
        '[role="menuitemradio"]',
        '[role="option"]',
        '[role="switch"]',
        '[role="tab"]',
        '[role="treeitem"]',
        '[role="gridcell"]',
        '[role="search"]',
        '[role="combobox"]',
        '[role="listbox"]',
        '[role="slider"]',
        '[role="spinbutton"]',
    ];
    const EDITABLE_SELECTORS = [
        'input[type="text"]',
        'input[type="password"]',
        'input[type="email"]',
        'input[type="tel"]',
        'input[type="number"]',
        'input[type="search"]',
        'input[type="url"]',
        'input[type="date"]',
        'input[type="time"]',
        'input[type="datetime-local"]',
        'input[type="month"]',
        'input[type="week"]',
        'input[type="color"]',
        'textarea',
        '[contenteditable="true"]',
    ];
    // Required visibility ratio for an element to be considered visible
    const VISIBILITY_RATIO = 0.6;
    // A difference in size and position of less than DISJOINT_THRESHOLD means the elements are joined
    const DISJOINT_THRESHOLD = 0.1;
    // Maximum ratio of the screen that an element can cover to be considered visible (to avoid huge ads)
    const MAX_COVER_RATIO = 0.8;
    // Size of batch for each promise when processing element visibility
    // Lower batch values may increase performance but in some cases, it can block the main thread
    const ELEMENT_BATCH_SIZE = 10;
    // Radius within which a box is considered surrounding another box
    // This is used for generating contrasted colors
    const SURROUNDING_RADIUS = 200;
    // Used when finding the right contrasted color for boxes
    const MAX_LUMINANCE = 0.7;
    const MIN_LUMINANCE = 0.25;
    const MIN_SATURATION = 0.3;

    class Filter {
    }

    function quickselect(arr, k, left, right, compare) {
        quickselectStep(arr, k, left || 0, right || (arr.length - 1), compare || defaultCompare);
    }

    function quickselectStep(arr, k, left, right, compare) {

        while (right > left) {
            if (right - left > 600) {
                var n = right - left + 1;
                var m = k - left + 1;
                var z = Math.log(n);
                var s = 0.5 * Math.exp(2 * z / 3);
                var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
                var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
                var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
                quickselectStep(arr, k, newLeft, newRight, compare);
            }

            var t = arr[k];
            var i = left;
            var j = right;

            swap(arr, left, k);
            if (compare(arr[right], t) > 0) swap(arr, left, right);

            while (i < j) {
                swap(arr, i, j);
                i++;
                j--;
                while (compare(arr[i], t) < 0) i++;
                while (compare(arr[j], t) > 0) j--;
            }

            if (compare(arr[left], t) === 0) swap(arr, left, j);
            else {
                j++;
                swap(arr, j, right);
            }

            if (j <= k) left = j + 1;
            if (k <= j) right = j - 1;
        }
    }

    function swap(arr, i, j) {
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }

    function defaultCompare(a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
    }

    class RBush {
        constructor(maxEntries = 9) {
            // max entries in a node is 9 by default; min node fill is 40% for best performance
            this._maxEntries = Math.max(4, maxEntries);
            this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));
            this.clear();
        }

        all() {
            return this._all(this.data, []);
        }

        search(bbox) {
            let node = this.data;
            const result = [];

            if (!intersects(bbox, node)) return result;

            const toBBox = this.toBBox;
            const nodesToSearch = [];

            while (node) {
                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    const childBBox = node.leaf ? toBBox(child) : child;

                    if (intersects(bbox, childBBox)) {
                        if (node.leaf) result.push(child);
                        else if (contains(bbox, childBBox)) this._all(child, result);
                        else nodesToSearch.push(child);
                    }
                }
                node = nodesToSearch.pop();
            }

            return result;
        }

        collides(bbox) {
            let node = this.data;

            if (!intersects(bbox, node)) return false;

            const nodesToSearch = [];
            while (node) {
                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    const childBBox = node.leaf ? this.toBBox(child) : child;

                    if (intersects(bbox, childBBox)) {
                        if (node.leaf || contains(bbox, childBBox)) return true;
                        nodesToSearch.push(child);
                    }
                }
                node = nodesToSearch.pop();
            }

            return false;
        }

        load(data) {
            if (!(data && data.length)) return this;

            if (data.length < this._minEntries) {
                for (let i = 0; i < data.length; i++) {
                    this.insert(data[i]);
                }
                return this;
            }

            // recursively build the tree with the given data from scratch using OMT algorithm
            let node = this._build(data.slice(), 0, data.length - 1, 0);

            if (!this.data.children.length) {
                // save as is if tree is empty
                this.data = node;

            } else if (this.data.height === node.height) {
                // split root if trees have the same height
                this._splitRoot(this.data, node);

            } else {
                if (this.data.height < node.height) {
                    // swap trees if inserted one is bigger
                    const tmpNode = this.data;
                    this.data = node;
                    node = tmpNode;
                }

                // insert the small tree into the large tree at appropriate level
                this._insert(node, this.data.height - node.height - 1, true);
            }

            return this;
        }

        insert(item) {
            if (item) this._insert(item, this.data.height - 1);
            return this;
        }

        clear() {
            this.data = createNode([]);
            return this;
        }

        remove(item, equalsFn) {
            if (!item) return this;

            let node = this.data;
            const bbox = this.toBBox(item);
            const path = [];
            const indexes = [];
            let i, parent, goingUp;

            // depth-first iterative tree traversal
            while (node || path.length) {

                if (!node) { // go up
                    node = path.pop();
                    parent = path[path.length - 1];
                    i = indexes.pop();
                    goingUp = true;
                }

                if (node.leaf) { // check current node
                    const index = findItem(item, node.children, equalsFn);

                    if (index !== -1) {
                        // item found, remove the item and condense tree upwards
                        node.children.splice(index, 1);
                        path.push(node);
                        this._condense(path);
                        return this;
                    }
                }

                if (!goingUp && !node.leaf && contains(node, bbox)) { // go down
                    path.push(node);
                    indexes.push(i);
                    i = 0;
                    parent = node;
                    node = node.children[0];

                } else if (parent) { // go right
                    i++;
                    node = parent.children[i];
                    goingUp = false;

                } else node = null; // nothing found
            }

            return this;
        }

        toBBox(item) { return item; }

        compareMinX(a, b) { return a.minX - b.minX; }
        compareMinY(a, b) { return a.minY - b.minY; }

        toJSON() { return this.data; }

        fromJSON(data) {
            this.data = data;
            return this;
        }

        _all(node, result) {
            const nodesToSearch = [];
            while (node) {
                if (node.leaf) result.push(...node.children);
                else nodesToSearch.push(...node.children);

                node = nodesToSearch.pop();
            }
            return result;
        }

        _build(items, left, right, height) {

            const N = right - left + 1;
            let M = this._maxEntries;
            let node;

            if (N <= M) {
                // reached leaf level; return leaf
                node = createNode(items.slice(left, right + 1));
                calcBBox(node, this.toBBox);
                return node;
            }

            if (!height) {
                // target height of the bulk-loaded tree
                height = Math.ceil(Math.log(N) / Math.log(M));

                // target number of root entries to maximize storage utilization
                M = Math.ceil(N / Math.pow(M, height - 1));
            }

            node = createNode([]);
            node.leaf = false;
            node.height = height;

            // split the items into M mostly square tiles

            const N2 = Math.ceil(N / M);
            const N1 = N2 * Math.ceil(Math.sqrt(M));

            multiSelect(items, left, right, N1, this.compareMinX);

            for (let i = left; i <= right; i += N1) {

                const right2 = Math.min(i + N1 - 1, right);

                multiSelect(items, i, right2, N2, this.compareMinY);

                for (let j = i; j <= right2; j += N2) {

                    const right3 = Math.min(j + N2 - 1, right2);

                    // pack each entry recursively
                    node.children.push(this._build(items, j, right3, height - 1));
                }
            }

            calcBBox(node, this.toBBox);

            return node;
        }

        _chooseSubtree(bbox, node, level, path) {
            while (true) {
                path.push(node);

                if (node.leaf || path.length - 1 === level) break;

                let minArea = Infinity;
                let minEnlargement = Infinity;
                let targetNode;

                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    const area = bboxArea(child);
                    const enlargement = enlargedArea(bbox, child) - area;

                    // choose entry with the least area enlargement
                    if (enlargement < minEnlargement) {
                        minEnlargement = enlargement;
                        minArea = area < minArea ? area : minArea;
                        targetNode = child;

                    } else if (enlargement === minEnlargement) {
                        // otherwise choose one with the smallest area
                        if (area < minArea) {
                            minArea = area;
                            targetNode = child;
                        }
                    }
                }

                node = targetNode || node.children[0];
            }

            return node;
        }

        _insert(item, level, isNode) {
            const bbox = isNode ? item : this.toBBox(item);
            const insertPath = [];

            // find the best node for accommodating the item, saving all nodes along the path too
            const node = this._chooseSubtree(bbox, this.data, level, insertPath);

            // put the item into the node
            node.children.push(item);
            extend(node, bbox);

            // split on node overflow; propagate upwards if necessary
            while (level >= 0) {
                if (insertPath[level].children.length > this._maxEntries) {
                    this._split(insertPath, level);
                    level--;
                } else break;
            }

            // adjust bboxes along the insertion path
            this._adjustParentBBoxes(bbox, insertPath, level);
        }

        // split overflowed node into two
        _split(insertPath, level) {
            const node = insertPath[level];
            const M = node.children.length;
            const m = this._minEntries;

            this._chooseSplitAxis(node, m, M);

            const splitIndex = this._chooseSplitIndex(node, m, M);

            const newNode = createNode(node.children.splice(splitIndex, node.children.length - splitIndex));
            newNode.height = node.height;
            newNode.leaf = node.leaf;

            calcBBox(node, this.toBBox);
            calcBBox(newNode, this.toBBox);

            if (level) insertPath[level - 1].children.push(newNode);
            else this._splitRoot(node, newNode);
        }

        _splitRoot(node, newNode) {
            // split root node
            this.data = createNode([node, newNode]);
            this.data.height = node.height + 1;
            this.data.leaf = false;
            calcBBox(this.data, this.toBBox);
        }

        _chooseSplitIndex(node, m, M) {
            let index;
            let minOverlap = Infinity;
            let minArea = Infinity;

            for (let i = m; i <= M - m; i++) {
                const bbox1 = distBBox(node, 0, i, this.toBBox);
                const bbox2 = distBBox(node, i, M, this.toBBox);

                const overlap = intersectionArea(bbox1, bbox2);
                const area = bboxArea(bbox1) + bboxArea(bbox2);

                // choose distribution with minimum overlap
                if (overlap < minOverlap) {
                    minOverlap = overlap;
                    index = i;

                    minArea = area < minArea ? area : minArea;

                } else if (overlap === minOverlap) {
                    // otherwise choose distribution with minimum area
                    if (area < minArea) {
                        minArea = area;
                        index = i;
                    }
                }
            }

            return index || M - m;
        }

        // sorts node children by the best axis for split
        _chooseSplitAxis(node, m, M) {
            const compareMinX = node.leaf ? this.compareMinX : compareNodeMinX;
            const compareMinY = node.leaf ? this.compareMinY : compareNodeMinY;
            const xMargin = this._allDistMargin(node, m, M, compareMinX);
            const yMargin = this._allDistMargin(node, m, M, compareMinY);

            // if total distributions margin value is minimal for x, sort by minX,
            // otherwise it's already sorted by minY
            if (xMargin < yMargin) node.children.sort(compareMinX);
        }

        // total margin of all possible split distributions where each node is at least m full
        _allDistMargin(node, m, M, compare) {
            node.children.sort(compare);

            const toBBox = this.toBBox;
            const leftBBox = distBBox(node, 0, m, toBBox);
            const rightBBox = distBBox(node, M - m, M, toBBox);
            let margin = bboxMargin(leftBBox) + bboxMargin(rightBBox);

            for (let i = m; i < M - m; i++) {
                const child = node.children[i];
                extend(leftBBox, node.leaf ? toBBox(child) : child);
                margin += bboxMargin(leftBBox);
            }

            for (let i = M - m - 1; i >= m; i--) {
                const child = node.children[i];
                extend(rightBBox, node.leaf ? toBBox(child) : child);
                margin += bboxMargin(rightBBox);
            }

            return margin;
        }

        _adjustParentBBoxes(bbox, path, level) {
            // adjust bboxes along the given tree path
            for (let i = level; i >= 0; i--) {
                extend(path[i], bbox);
            }
        }

        _condense(path) {
            // go through the path, removing empty nodes and updating bboxes
            for (let i = path.length - 1, siblings; i >= 0; i--) {
                if (path[i].children.length === 0) {
                    if (i > 0) {
                        siblings = path[i - 1].children;
                        siblings.splice(siblings.indexOf(path[i]), 1);

                    } else this.clear();

                } else calcBBox(path[i], this.toBBox);
            }
        }
    }

    function findItem(item, items, equalsFn) {
        if (!equalsFn) return items.indexOf(item);

        for (let i = 0; i < items.length; i++) {
            if (equalsFn(item, items[i])) return i;
        }
        return -1;
    }

    // calculate node's bbox from bboxes of its children
    function calcBBox(node, toBBox) {
        distBBox(node, 0, node.children.length, toBBox, node);
    }

    // min bounding rectangle of node children from k to p-1
    function distBBox(node, k, p, toBBox, destNode) {
        if (!destNode) destNode = createNode(null);
        destNode.minX = Infinity;
        destNode.minY = Infinity;
        destNode.maxX = -Infinity;
        destNode.maxY = -Infinity;

        for (let i = k; i < p; i++) {
            const child = node.children[i];
            extend(destNode, node.leaf ? toBBox(child) : child);
        }

        return destNode;
    }

    function extend(a, b) {
        a.minX = Math.min(a.minX, b.minX);
        a.minY = Math.min(a.minY, b.minY);
        a.maxX = Math.max(a.maxX, b.maxX);
        a.maxY = Math.max(a.maxY, b.maxY);
        return a;
    }

    function compareNodeMinX(a, b) { return a.minX - b.minX; }
    function compareNodeMinY(a, b) { return a.minY - b.minY; }

    function bboxArea(a) { return (a.maxX - a.minX) * (a.maxY - a.minY); }
    function bboxMargin(a) { return (a.maxX - a.minX) + (a.maxY - a.minY); }

    function enlargedArea(a, b) {
        return (Math.max(b.maxX, a.maxX) - Math.min(b.minX, a.minX)) *
            (Math.max(b.maxY, a.maxY) - Math.min(b.minY, a.minY));
    }

    function intersectionArea(a, b) {
        const minX = Math.max(a.minX, b.minX);
        const minY = Math.max(a.minY, b.minY);
        const maxX = Math.min(a.maxX, b.maxX);
        const maxY = Math.min(a.maxY, b.maxY);

        return Math.max(0, maxX - minX) *
            Math.max(0, maxY - minY);
    }

    function contains(a, b) {
        return a.minX <= b.minX &&
            a.minY <= b.minY &&
            b.maxX <= a.maxX &&
            b.maxY <= a.maxY;
    }

    function intersects(a, b) {
        return b.minX <= a.maxX &&
            b.minY <= a.maxY &&
            b.maxX >= a.minX &&
            b.maxY >= a.minY;
    }

    function createNode(children) {
        return {
            children,
            height: 1,
            leaf: true,
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity
        };
    }

    // sort an array so that items come in groups of n unsorted items, with groups sorted between each other;
    // combines selection algorithm with binary divide & conquer approach

    function multiSelect(arr, left, right, n, compare) {
        const stack = [left, right];

        while (stack.length) {
            right = stack.pop();
            left = stack.pop();

            if (right - left <= n) continue;

            const mid = left + Math.ceil((right - left) / n / 2) * n;
            quickselect(arr, mid, left, right, compare);

            stack.push(left, mid, mid, right);
        }
    }

    /**
     * A class for mapping out the DOM tree and efficiently querying all intersecting elements for a given rectangle.
     */
    class DOMTree {
        bounds;
        tree = new RBush();
        constructor(bounds) {
            this.bounds = bounds;
        }
        /**
         * Inserts a new rectangle into the tree.
         */
        insert(rect) {
            // If the rectangle is outside of the bounds, ignore it
            if (!this.bounds.containsThreshold(rect, VISIBILITY_RATIO)) {
                return;
            }
            this.tree.insert(rect.data);
        }
        /**
         * Inserts a list of rectangles into the tree.
         */
        insertAll(rects) {
            const data = rects
                .filter((rect) => this.bounds.containsThreshold(rect, VISIBILITY_RATIO))
                .map((rect) => rect.data);
            this.tree.load(data);
        }
        /**
         * Returns all rectangles that intersect with the given rectangle.
         */
        query(rect) {
            const foundRects = this.tree.search(rect.data);
            return foundRects.flatMap((foundRect) => foundRect.elements);
        }
    }
    class Rectangle {
        x;
        y;
        width;
        height;
        elements;
        constructor(x, y, width, height, elements = []) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.elements = elements;
        }
        get area() {
            return this.width * this.height;
        }
        get data() {
            return {
                minX: this.x,
                minY: this.y,
                maxX: this.x + this.width,
                maxY: this.y + this.height,
                elements: this.elements,
            };
        }
        disjoint(rect) {
            // Using DISJOINT_THRESHOLD, if the different in size and position is less than DISJOINT_THRESHOLD, the elements are joined
            return (Math.abs(this.x - rect.x) > DISJOINT_THRESHOLD * this.x ||
                Math.abs(this.y - rect.y) > DISJOINT_THRESHOLD * this.y ||
                Math.abs(this.width - rect.width) > DISJOINT_THRESHOLD * this.width ||
                Math.abs(this.height - rect.height) > DISJOINT_THRESHOLD * this.height);
        }
        join(rect) {
            const x = Math.min(this.x, rect.x);
            const y = Math.min(this.y, rect.y);
            const width = Math.max(this.x + this.width, rect.x + rect.width) - x;
            const height = Math.max(this.y + this.height, rect.y + rect.height) - y;
            return new Rectangle(x, y, width, height, [
                ...this.elements,
                ...rect.elements,
            ]);
        }
        contains(rect) {
            return (rect.x >= this.x &&
                rect.x + rect.width <= this.x + this.width &&
                rect.y >= this.y &&
                rect.y + rect.height <= this.y + this.height);
        }
        containsThreshold(rect, threshold) {
            // Contain at least (threshold * 100)% of the rectangle
            const x1 = Math.max(this.x, rect.x);
            const y1 = Math.max(this.y, rect.y);
            const x2 = Math.min(this.x + this.width, rect.x + rect.width);
            const y2 = Math.min(this.y + this.height, rect.y + rect.height);
            const intersection = (x2 - x1) * (y2 - y1);
            const area = rect.width * rect.height;
            return intersection >= area * threshold;
        }
        intersects(rect) {
            return !(rect.x > this.x + this.width ||
                rect.x + rect.width < this.x ||
                rect.y > this.y + this.height ||
                rect.y + rect.height < this.y);
        }
    }

    /*
     * Utility
     */
    /**
     * Check if element is below referenceElement
     * @param element The element to check
     * @param referenceElement The reference element to check against
     * @returns True if element is below referenceElement, false otherwise
     */
    function isAbove(element, referenceElement) {
        // Helper function to get the effective z-index value
        function getEffectiveZIndex(element, other) {
            while (element) {
                const zIndex = window.getComputedStyle(element).zIndex;
                if (zIndex !== 'auto') {
                    const zIndexValue = parseInt(zIndex, 10);
                    // Do not count the z-index of a common parent
                    if (element.contains(other)) {
                        return 0;
                    }
                    return isNaN(zIndexValue) ? 0 : zIndexValue;
                }
                element = element.parentElement;
            }
            return 0;
        }
        const elementZIndex = getEffectiveZIndex(element, referenceElement);
        const referenceElementZIndex = getEffectiveZIndex(referenceElement, element);
        const elementPosition = element.compareDocumentPosition(referenceElement);
        // Check if element is a child or a parent of referenceElement
        if (elementPosition & Node.DOCUMENT_POSITION_CONTAINS ||
            elementPosition & Node.DOCUMENT_POSITION_CONTAINED_BY) {
            return false;
        }
        // Compare z-index values
        if (elementZIndex !== referenceElementZIndex) {
            return elementZIndex < referenceElementZIndex;
        }
        // As a fallback, compare document order
        return !!(elementPosition & Node.DOCUMENT_POSITION_PRECEDING);
    }
    function isVisible(element) {
        if (element.offsetWidth === 0 && element.offsetHeight === 0) {
            return false;
        }
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            return false;
        }
        const style = window.getComputedStyle(element);
        if (style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.pointerEvents === 'none') {
            return false;
        }
        let parent = element.parentElement;
        while (parent !== null) {
            const parentStyle = window.getComputedStyle(parent);
            if (parentStyle.display === 'none' ||
                parentStyle.visibility === 'hidden' ||
                parentStyle.pointerEvents === 'none') {
                return false;
            }
            parent = parent.parentElement;
        }
        return true;
    }

    class VisibilityCanvas {
        element;
        canvas;
        ctx;
        rect;
        visibleRect;
        constructor(element) {
            this.element = element;
            this.element = element;
            this.rect = this.element.getBoundingClientRect();
            this.canvas = new OffscreenCanvas(this.rect.width, this.rect.height);
            this.ctx = this.canvas.getContext('2d', {
                willReadFrequently: true,
            });
            this.ctx.imageSmoothingEnabled = false;
            this.visibleRect = {
                top: Math.max(0, this.rect.top),
                left: Math.max(0, this.rect.left),
                bottom: Math.min(window.innerHeight, this.rect.bottom),
                right: Math.min(window.innerWidth, this.rect.right),
                width: this.rect.width,
                height: this.rect.height,
            };
            this.visibleRect.width = this.visibleRect.right - this.visibleRect.left;
            this.visibleRect.height = this.visibleRect.bottom - this.visibleRect.top;
        }
        async eval(qt) {
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawElement(this.element, 'white');
            const canvasVisRect = {
                top: this.visibleRect.top - this.rect.top,
                bottom: this.visibleRect.bottom - this.rect.top,
                left: this.visibleRect.left - this.rect.left,
                right: this.visibleRect.right - this.rect.left,
                width: this.canvas.width,
                height: this.canvas.height,
            };
            const totalPixels = await this.countVisiblePixels(canvasVisRect);
            if (totalPixels === 0)
                return 0;
            const elements = this.getIntersectingElements(qt);
            for (const el of elements) {
                this.drawElement(el, 'black');
            }
            const visiblePixels = await this.countVisiblePixels(canvasVisRect);
            return visiblePixels / totalPixels;
        }
        getIntersectingElements(qt) {
            const range = new Rectangle(this.rect.left, this.rect.right, this.rect.width, this.rect.height, [this.element]);
            const candidates = qt.query(range);
            // Now, for the sake of avoiding completely hidden elements, we do one elementsOnPoint check
            const elementsFromPoint = document.elementsFromPoint(this.rect.left + this.rect.width / 2, this.rect.top + this.rect.height / 2);
            return candidates
                .concat(elementsFromPoint)
                .filter((el, i, arr) => arr.indexOf(el) === i && isVisible(el) && isAbove(this.element, el));
        }
        async countVisiblePixels(visibleRect) {
            const imageData = this.ctx.getImageData(visibleRect.left, visibleRect.top, visibleRect.width, visibleRect.height);
            let visiblePixels = 0;
            for (let i = 0; i < imageData.data.length; i += 4) {
                const isWhite = imageData.data[i + 1] === 255;
                if (isWhite) {
                    visiblePixels++;
                }
            }
            return visiblePixels;
        }
        drawElement(element, color = 'black') {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);
            const radius = styles.borderRadius?.split(' ').map((r) => parseFloat(r));
            const clipPath = styles.clipPath;
            const offsetRect = {
                top: rect.top - this.rect.top,
                bottom: rect.bottom - this.rect.top,
                left: rect.left - this.rect.left,
                right: rect.right - this.rect.left,
                width: rect.width,
                height: rect.height,
            };
            offsetRect.width = offsetRect.right - offsetRect.left;
            offsetRect.height = offsetRect.bottom - offsetRect.top;
            this.ctx.fillStyle = color;
            if (clipPath && clipPath !== 'none') {
                const clips = clipPath.split(/,| /);
                clips.forEach((clip) => {
                    const kind = clip.trim().match(/^([a-z]+)\((.*)\)$/);
                    if (!kind) {
                        return;
                    }
                    switch (kind[0]) {
                        case 'polygon':
                            const path = this.pathFromPolygon(clip, rect);
                            this.ctx.fill(path);
                            break;
                        default:
                            console.log('Unknown clip path kind: ' + kind);
                    }
                });
            }
            else if (radius) {
                const path = new Path2D();
                if (radius.length === 1)
                    radius[1] = radius[0];
                if (radius.length === 2)
                    radius[2] = radius[0];
                if (radius.length === 3)
                    radius[3] = radius[1];
                // Go to the top left corner
                path.moveTo(offsetRect.left + radius[0], offsetRect.top);
                path.arcTo(
                    // Arc to the top right corner
                    offsetRect.right, offsetRect.top, offsetRect.right, offsetRect.bottom, radius[1]);
                path.arcTo(offsetRect.right, offsetRect.bottom, offsetRect.left, offsetRect.bottom, radius[2]);
                path.arcTo(offsetRect.left, offsetRect.bottom, offsetRect.left, offsetRect.top, radius[3]);
                path.arcTo(offsetRect.left, offsetRect.top, offsetRect.right, offsetRect.top, radius[0]);
                path.closePath();
                this.ctx.fill(path);
            }
            else {
                this.ctx.fillRect(offsetRect.left, offsetRect.top, offsetRect.width, offsetRect.height);
            }
        }
        pathFromPolygon(polygon, rect) {
            if (!polygon || !polygon.match(/^polygon\((.*)\)$/)) {
                throw new Error('Invalid polygon format: ' + polygon);
            }
            const path = new Path2D();
            const points = polygon.match(/\d+(\.\d+)?%/g);
            if (points && points.length >= 2) {
                const startX = parseFloat(points[0]);
                const startY = parseFloat(points[1]);
                path.moveTo((startX * rect.width) / 100, (startY * rect.height) / 100);
                for (let i = 2; i < points.length; i += 2) {
                    const x = parseFloat(points[i]);
                    const y = parseFloat(points[i + 1]);
                    path.lineTo((x * rect.width) / 100, (y * rect.height) / 100);
                }
                path.closePath();
            }
            return path;
        }
    }

    class VisibilityFilter extends Filter {
        dt;
        async apply(elements) {
            this.dt = this.buildDOMTree();
            const results = await Promise.all([
                this.applyScoped(elements.fixed),
                this.applyScoped(elements.unknown),
            ]);
            return {
                fixed: results[0],
                unknown: results[1],
            };
        }
        async applyScoped(elements) {
            const results = await Promise.all(Array.from({
                length: Math.ceil(elements.length / ELEMENT_BATCH_SIZE),
            }).map(async (_, i) => {
                const batch = elements
                    .slice(i * ELEMENT_BATCH_SIZE, (i + 1) * ELEMENT_BATCH_SIZE)
                    .filter((el) => isVisible(el));
                // Now, let's process the batch
                const visibleElements = [];
                for (const element of batch) {
                    const isVisible = await this.isDeepVisible(element);
                    if (isVisible) {
                        visibleElements.push(element);
                    }
                }
                return visibleElements;
            }));
            return results.flat();
        }
        buildDOMTree() {
            const boundary = new Rectangle(0, 0, window.innerWidth, window.innerHeight);
            const dt = new DOMTree(boundary);
            // Use a tree walker to traverse the DOM tree
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
            const buf = [];
            let currentNode = walker.currentNode;
            while (currentNode) {
                const element = currentNode;
                if (isVisible(element)) {
                    const rect = element.getBoundingClientRect();
                    buf.push(new Rectangle(rect.left, rect.top, rect.width, rect.height, [element]));
                }
                currentNode = walker.nextNode();
            }
            // Finally, insert all the rectangles into the tree
            dt.insertAll(buf);
            return dt;
        }
        async isDeepVisible(element) {
            return new Promise((resolve) => {
                const observer = new IntersectionObserver(async (entries) => {
                    const entry = entries[0];
                    observer.disconnect();
                    if (entry.intersectionRatio < VISIBILITY_RATIO) {
                        resolve(false);
                        return;
                    }
                    const rect = element.getBoundingClientRect();
                    // If rect is covering more than size * MAX_COVER_RATIO of the screen ignore it (we do not want to consider full screen ads)
                    if (rect.width >= window.innerWidth * MAX_COVER_RATIO ||
                        rect.height >= window.innerHeight * MAX_COVER_RATIO) {
                        resolve(false);
                        return;
                    }
                    // IntersectionObserver only checks intersection with the viewport, not with other elements
                    // Thus, we need to calculate the visible area ratio relative to the intersecting elements
                    const canvas = new VisibilityCanvas(element);
                    const visibleAreaRatio = await canvas.eval(this.dt);
                    resolve(visibleAreaRatio >= VISIBILITY_RATIO);
                });
                observer.observe(element);
            });
        }
    }

    // Threshold to be considered disjoint from the top-level element
    const SIZE_THRESHOLD = 0.9;
    // Threshold to remove top-level elements with too many children
    const QUANTITY_THRESHOLD = 3;
    // Elements to prioritize (as in to to avoid keeping any children from these elements)
    const PRIORITY_SELECTOR = ["a", "button", "input", "select", "textarea"];
    class NestingFilter extends Filter {
        async apply(elements) {
            // Basically, what we want to do it is compare the size of the top-level elements with the size of their children.
            // For that, we make branches and compare with the first children of each of these branches.
            // If there are other children beyond that, we'll recursively call this function on them.
            const fullElements = elements.fixed.concat(elements.unknown);
            const { top, others } = this.getTopLevelElements(fullElements);
            const results = await Promise.all(top.map(async (topElement) => this.compareTopWithChildren(topElement, others)));
            return {
                fixed: elements.fixed,
                unknown: results.flat().filter((el) => elements.fixed.indexOf(el) === -1),
            };
        }
        async compareTopWithChildren(top, children) {
            if (PRIORITY_SELECTOR.some((selector) => top.matches(selector))) {
                return [top];
            }
            const branches = this.getBranches(top, children);
            const rect = top.getBoundingClientRect();
            if (branches.length <= 1) {
                return [top];
            }
            const results = await Promise.all(branches.map(async (branch) => {
                // Let's compare the size of the top-level element with the size of the first hit
                const firstHitRect = branch.top.getBoundingClientRect();
                // If the difference in size is too big, we'll consider them disjoint.
                // If that's the case, then we recursively call this function on the children.
                if (firstHitRect.width / rect.width < SIZE_THRESHOLD &&
                    firstHitRect.height / rect.height < SIZE_THRESHOLD) {
                    return [];
                }
                if (branch.children.length === 0) {
                    return [branch.top];
                }
                return this.compareTopWithChildren(branch.top, branch.children);
            }));
            const total = results.flat();
            if (total.length > QUANTITY_THRESHOLD) {
                return total;
            }
            return [top, ...total];
        }
        getBranches(element, elements) {
            const firstHits = this.getFirstHitChildren(element, elements);
            return firstHits.map((firstHit) => {
                const children = elements.filter((child) => !firstHits.includes(child) && firstHit.contains(child));
                return { top: firstHit, children };
            });
        }
        getFirstHitChildren(element, elements) {
            // We'll basically map out the direct childrens of that element.
            // We'll continue doing this recursively until we get a hit.
            // If there's more than one hit, just make a list of them.
            const directChildren = element.querySelectorAll(":scope > *");
            const clickableDirectChildren = Array.from(directChildren).filter((child) => elements.includes(child));
            if (clickableDirectChildren.length > 0) {
                return clickableDirectChildren;
            }
            return Array.from(directChildren).flatMap((child) => this.getFirstHitChildren(child, elements));
        }
        getTopLevelElements(elements) {
            const topLevelElements = [], nonTopLevelElements = [];
            for (const element of elements) {
                if (!elements.some((otherElement) => otherElement !== element && otherElement.contains(element))) {
                    topLevelElements.push(element);
                }
                else {
                    nonTopLevelElements.push(element);
                }
            }
            return { top: topLevelElements, others: nonTopLevelElements };
        }
    }

    class Loader {
        filters = {
            visibility: new VisibilityFilter(),
            nesting: new NestingFilter(),
        };
        async loadElements() {
            const selector = SELECTORS.join(',');
            let fixedElements = Array.from(document.querySelectorAll(selector));
            // Let's also do a querySelectorAll inside all the shadow roots (for custom elements, e.g. reddit)
            const shadowRoots = this.shadowRoots();
            for (let i = 0; i < shadowRoots.length; i++) {
                fixedElements = fixedElements.concat(Array.from(shadowRoots[i].querySelectorAll(selector)));
            }
            let unknownElements = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
                acceptNode() {
                    return NodeFilter.FILTER_ACCEPT;
                },
            });
            let node;
            while ((node = walker.nextNode())) {
                const el = node;
                if (!el.matches(selector) &&
                    window.getComputedStyle(el).cursor === 'pointer') {
                    unknownElements.push(el);
                }
            }
            unknownElements = Array.from(unknownElements)
                .filter((element, index, self) => self.indexOf(element) === index)
                .filter((element) => !element.closest('svg') &&
                    !fixedElements.some((el) => el.contains(element)));
            let interactive = {
                fixed: fixedElements,
                unknown: unknownElements,
            };
            console.groupCollapsed('Elements');
            console.log('Before filters', interactive);
            interactive = await this.filters.visibility.apply(interactive);
            console.log('After visibility filter', interactive);
            interactive = await this.filters.nesting.apply(interactive);
            console.log('After nesting filter', interactive);
            console.groupEnd();
            return interactive.fixed
                .concat(interactive.unknown)
                .reduce((acc, el) => {
                    // Remove all elements that have the same rect, while keeping either the editable one, then the first one
                    const rect = el.getBoundingClientRect();
                    const sameRect = acc.filter((element) => element.getBoundingClientRect().top === rect.top &&
                        element.getBoundingClientRect().left === rect.left);
                    if (sameRect.length > 0) {
                        const editable = sameRect.find((element) => element.isContentEditable ||
                            EDITABLE_SELECTORS.some((selector) => element.matches(selector)));
                        if (editable) {
                            return acc.filter((element) => element !== editable).concat(el);
                        }
                        return acc;
                    }
                    return acc.concat(el);
                }, []);
        }
        shadowRoots() {
            const shadowRoots = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
                acceptNode(node) {
                    return NodeFilter.FILTER_ACCEPT;
                },
            });
            let node;
            while ((node = walker.nextNode())) {
                if (node && node.shadowRoot) {
                    shadowRoots.push(node.shadowRoot);
                }
            }
            return shadowRoots;
        }
    }

    class UIColors {
        contrastColor(element, surroundingColors) {
            const style = window.getComputedStyle(element);
            const bgColor = Color.fromCSS(style.backgroundColor);
            return this.getBestContrastColor([bgColor, ...surroundingColors]);
        }
        getBestContrastColor(colors) {
            const complimentaryColors = colors
                .filter((color) => color.a > 0)
                .map((color) => color.complimentary());
            let color;
            // If there are no colors left, generate a random color
            if (complimentaryColors.length === 0) {
                color = this.generateColor();
            }
            else {
                color = this.getAverageColor(complimentaryColors);
            }
            if (color.r === 0 && color.g === 0 && color.b === 0) {
                color = this.generateColor();
            }
            // Avoid colors that are too dark or too bright by increasing the luminance
            if (color.luminance() > MAX_LUMINANCE) {
                color = color.withLuminance(MAX_LUMINANCE);
            }
            else if (color.luminance() < MIN_LUMINANCE) {
                color = color.withLuminance(MIN_LUMINANCE);
            }
            if (color.saturation() < MIN_SATURATION) {
                color = color.withSaturation(MIN_SATURATION);
            }
            return color;
        }
        generateColor() {
            return Color.fromHSL({
                h: Math.random(),
                s: 1, // Always keep the saturation full as we want to avoid plain colors
                l: Math.random() * (MAX_LUMINANCE - MIN_LUMINANCE) + MIN_LUMINANCE,
            });
        }
        getAverageColor(colors) {
            // Basically, we map out those colors into hsl, calculate their complimentary colors, and then average them out
            // To find the overall complimentary color for the group
            const hsls = colors.map((color) => color.toHsl());
            const avgHsl = hsls.reduce((acc, hsl) => {
                acc.h += hsl.h;
                acc.s += hsl.s;
                acc.l += hsl.l;
                return acc;
            }, { h: 0, s: 0, l: 0 });
            avgHsl.h /= hsls.length;
            avgHsl.s /= hsls.length;
            avgHsl.l /= hsls.length;
            return Color.fromHSL(avgHsl);
        }
    }
    class Color {
        r;
        g;
        b;
        a;
        constructor(r, g, b, a = 255) {
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
            if (r < 0 || r > 255) {
                throw new Error(`Invalid red value: ${r}`);
            }
            if (g < 0 || g > 255) {
                throw new Error(`Invalid green value: ${g}`);
            }
            if (b < 0 || b > 255) {
                throw new Error(`Invalid blue value: ${b}`);
            }
            if (a < 0 || a > 255) {
                throw new Error(`Invalid alpha value: ${a}`);
            }
            this.r = Math.round(r);
            this.g = Math.round(g);
            this.b = Math.round(b);
            this.a = Math.round(a);
        }
        static fromCSS(css) {
            if (css.startsWith('#')) {
                return Color.fromHex(css);
            }
            if (css.startsWith('rgb')) {
                const rgb = css
                    .replace(/rgba?\(/, '')
                    .replace(')', '')
                    .split(',')
                    .map((c) => parseInt(c.trim()));
                return new Color(...rgb);
            }
            if (css.startsWith('hsl')) {
                const hsl = css
                    .replace(/hsla?\(/, '')
                    .replace(')', '')
                    .split(',')
                    .map((c) => parseFloat(c.trim()));
                return Color.fromHSL({ h: hsl[0], s: hsl[1], l: hsl[2] });
            }
            const hex = NamedColors[css.toLowerCase()];
            if (hex) {
                return Color.fromHex(hex);
            }
            throw new Error(`Unknown color format: ${css}`);
        }
        static fromHex(hex) {
            hex = hex.replace('#', '');
            if (hex.length === 3) {
                hex = hex
                    .split('')
                    .map((char) => char + char)
                    .join('');
            }
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            if (hex.length === 8) {
                const a = parseInt(hex.substring(6, 8), 16);
                return new Color(r, g, b, a);
            }
            return new Color(r, g, b);
        }
        static fromHSL(hsl) {
            const h = hsl.h;
            const s = hsl.s;
            const l = hsl.l;
            let r, g, b;
            if (s === 0) {
                r = g = b = l; // achromatic
            }
            else {
                const hue2rgb = (p, q, t) => {
                    if (t < 0)
                        t += 1;
                    if (t > 1)
                        t -= 1;
                    if (t < 1 / 6)
                        return p + (q - p) * 6 * t;
                    if (t < 1 / 2)
                        return q;
                    if (t < 2 / 3)
                        return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                };
                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1 / 3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1 / 3);
            }
            return new Color(r * 255, g * 255, b * 255);
        }
        luminance() {
            const r = this.r / 255;
            const g = this.g / 255;
            const b = this.b / 255;
            const a = [r, g, b].map((c) => {
                if (c <= 0.03928) {
                    return c / 12.92;
                }
                return Math.pow((c + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
        }
        withLuminance(luminance) {
            // Lower or increase the ratio of each color to match the desired luminance
            // We want to keep the same overall color (i.e. green stays green, red stays red, etc.)
            const l = this.luminance();
            if (l === 0) {
                return new Color(0, 0, 0, this.a);
            }
            const ratio = luminance / l;
            const r = Math.min(255, this.r * ratio);
            const g = Math.min(255, this.g * ratio);
            const b = Math.min(255, this.b * ratio);
            return new Color(r, g, b, this.a);
        }
        saturation() {
            return this.toHsl().s;
        }
        withSaturation(saturation) {
            const hsl = this.toHsl();
            hsl.s = saturation;
            return Color.fromHSL(hsl);
        }
        contrast(color) {
            const l1 = this.luminance();
            const l2 = color.luminance();
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        }
        complimentary() {
            const hsl = this.toHsl();
            hsl.h = (hsl.h + 0.5) % 1;
            return Color.fromHSL(hsl);
        }
        toHex() {
            const r = this.r.toString(16).padStart(2, '0');
            const g = this.g.toString(16).padStart(2, '0');
            const b = this.b.toString(16).padStart(2, '0');
            if (this.a < 255) {
                const a = this.a.toString(16).padStart(2, '0');
                return `#${r}${g}${b}${a}`;
            }
            return `#${r}${g}${b}`;
        }
        toHsl() {
            const r = this.r / 255;
            const g = this.g / 255;
            const b = this.b / 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h = (max + min) / 2;
            let s = (max + min) / 2;
            let l = (max + min) / 2;
            if (max === min) {
                h = s = 0; // achromatic
            }
            else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r:
                        h = (g - b) / d + (g < b ? 6 : 0);
                        break;
                    case g:
                        h = (b - r) / d + 2;
                        break;
                    case b:
                        h = (r - g) / d + 4;
                        break;
                }
                h /= 6;
            }
            return { h, s, l, a: this.a / 255 };
        }
        toString() {
            return this.toHex();
        }
    }
    const NamedColors = {
        aliceblue: '#f0f8ff',
        antiquewhite: '#faebd7',
        aqua: '#00ffff',
        aquamarine: '#7fffd4',
        azure: '#f0ffff',
        beige: '#f5f5dc',
        bisque: '#ffe4c4',
        black: '#000000',
        blanchedalmond: '#ffebcd',
        blue: '#0000ff',
        blueviolet: '#8a2be2',
        brown: '#a52a2a',
        burlywood: '#deb887',
        cadetblue: '#5f9ea0',
        chartreuse: '#7fff00',
        chocolate: '#d2691e',
        coral: '#ff7f50',
        cornflowerblue: '#6495ed',
        cornsilk: '#fff8dc',
        crimson: '#dc143c',
        cyan: '#00ffff',
        darkblue: '#00008b',
        darkcyan: '#008b8b',
        darkgoldenrod: '#b8860b',
        darkgray: '#a9a9a9',
        darkgreen: '#006400',
        darkkhaki: '#bdb76b',
        darkmagenta: '#8b008b',
        darkolivegreen: '#556b2f',
        darkorange: '#ff8c00',
        darkorchid: '#9932cc',
        darkred: '#8b0000',
        darksalmon: '#e9967a',
        darkseagreen: '#8fbc8f',
        darkslateblue: '#483d8b',
        darkslategray: '#2f4f4f',
        darkturquoise: '#00ced1',
        darkviolet: '#9400d3',
        deeppink: '#ff1493',
        deepskyblue: '#00bfff',
        dimgray: '#696969',
        dodgerblue: '#1e90ff',
        firebrick: '#b22222',
        floralwhite: '#fffaf0',
        forestgreen: '#228b22',
        fuchsia: '#ff00ff',
        gainsboro: '#dcdcdc',
        ghostwhite: '#f8f8ff',
        gold: '#ffd700',
        goldenrod: '#daa520',
        gray: '#808080',
        green: '#008000',
        greenyellow: '#adff2f',
        honeydew: '#f0fff0',
        hotpink: '#ff69b4',
        'indianred ': '#cd5c5c',
        indigo: '#4b0082',
        ivory: '#fffff0',
        khaki: '#f0e68c',
        lavender: '#e6e6fa',
        lavenderblush: '#fff0f5',
        lawngreen: '#7cfc00',
        lemonchiffon: '#fffacd',
        lightblue: '#add8e6',
        lightcoral: '#f08080',
        lightcyan: '#e0ffff',
        lightgoldenrodyellow: '#fafad2',
        lightgrey: '#d3d3d3',
        lightgreen: '#90ee90',
        lightpink: '#ffb6c1',
        lightsalmon: '#ffa07a',
        lightseagreen: '#20b2aa',
        lightskyblue: '#87cefa',
        lightslategray: '#778899',
        lightsteelblue: '#b0c4de',
        lightyellow: '#ffffe0',
        lime: '#00ff00',
        limegreen: '#32cd32',
        linen: '#faf0e6',
        magenta: '#ff00ff',
        maroon: '#800000',
        mediumaquamarine: '#66cdaa',
        mediumblue: '#0000cd',
        mediumorchid: '#ba55d3',
        mediumpurple: '#9370d8',
        mediumseagreen: '#3cb371',
        mediumslateblue: '#7b68ee',
        mediumspringgreen: '#00fa9a',
        mediumturquoise: '#48d1cc',
        mediumvioletred: '#c71585',
        midnightblue: '#191970',
        mintcream: '#f5fffa',
        mistyrose: '#ffe4e1',
        moccasin: '#ffe4b5',
        navajowhite: '#ffdead',
        navy: '#000080',
        oldlace: '#fdf5e6',
        olive: '#808000',
        olivedrab: '#6b8e23',
        orange: '#ffa500',
        orangered: '#ff4500',
        orchid: '#da70d6',
        palegoldenrod: '#eee8aa',
        palegreen: '#98fb98',
        paleturquoise: '#afeeee',
        palevioletred: '#d87093',
        papayawhip: '#ffefd5',
        peachpuff: '#ffdab9',
        peru: '#cd853f',
        pink: '#ffc0cb',
        plum: '#dda0dd',
        powderblue: '#b0e0e6',
        purple: '#800080',
        rebeccapurple: '#663399',
        red: '#ff0000',
        rosybrown: '#bc8f8f',
        royalblue: '#4169e1',
        saddlebrown: '#8b4513',
        salmon: '#fa8072',
        sandybrown: '#f4a460',
        seagreen: '#2e8b57',
        seashell: '#fff5ee',
        sienna: '#a0522d',
        silver: '#c0c0c0',
        skyblue: '#87ceeb',
        slateblue: '#6a5acd',
        slategray: '#708090',
        snow: '#fffafa',
        springgreen: '#00ff7f',
        steelblue: '#4682b4',
        tan: '#d2b48c',
        teal: '#008080',
        thistle: '#d8bfd8',
        tomato: '#ff6347',
        turquoise: '#40e0d0',
        violet: '#ee82ee',
        wheat: '#f5deb3',
        white: '#ffffff',
        whitesmoke: '#f5f5f5',
        yellow: '#ffff00',
        yellowgreen: '#9acd32',
    };

    class UI {
        colors = new UIColors();
        display(elements) {
            let wrapper = document.querySelector('som-wrapper');
            if (!wrapper) {
                wrapper = document.createElement('som-wrapper');
                document.body.appendChild(wrapper);
            }
            const labels = [];
            const boundingBoxes = [];
            const rawBoxes = [];
            // First, define the bounding boxes
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                const rect = element.getBoundingClientRect();
                const box = document.createElement('som-box');
                box.style.left = `${rect.left}px`;
                box.style.top = `${rect.top}px`;
                box.style.width = `${rect.width}px`;
                box.style.height = `${rect.height}px`;
                box.classList.add('SoM');
                // If the element is editable, add additional class
                if (element.isContentEditable ||
                    EDITABLE_SELECTORS.some((selector) => element.matches(selector))) {
                    box.classList.add('editable');
                }
                // To generate a color, we'll need to first get the colors of the surrounding boxes
                const surroundingColors = boundingBoxes
                    .filter((box) => {
                        // Check if it is within SURROUNDING_RADIUS, from any of its corners
                        const distances = [
                            Math.sqrt(Math.pow(rect.left - box.left, 2) +
                                Math.pow(rect.top - box.top, 2)),
                            Math.sqrt(Math.pow(rect.right - box.right, 2) +
                                Math.pow(rect.top - box.top, 2)),
                            Math.sqrt(Math.pow(rect.left - box.left, 2) +
                                Math.pow(rect.bottom - box.bottom, 2)),
                            Math.sqrt(Math.pow(rect.right - box.right, 2) +
                                Math.pow(rect.bottom - box.bottom, 2)),
                        ];
                        return distances.some((distance) => distance < SURROUNDING_RADIUS);
                    })
                    .map((box) => box.color);
                const color = this.colors.contrastColor(element, surroundingColors);
                // Set color as variable to be used in CSS
                box.style.setProperty('--SoM-color', `${color.r}, ${color.g}, ${color.b}`);
                wrapper.appendChild(box);
                boundingBoxes.push({
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                    width: rect.width,
                    height: rect.height,
                    color: color,
                });
                rawBoxes.push(box);
            }
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                const box = boundingBoxes[i];
                const label = document.createElement('som-label');
                label.textContent = `${i}`;
                label.style.color = this.getColorByLuminance(box.color);
                label.classList.add('SoM--label');
                rawBoxes[i].appendChild(label);
                const labelRect = label.getBoundingClientRect();
                const gridSize = 10;
                const positions = [];
                for (let i = 0; i <= gridSize; i++) {
                    // Top side
                    positions.push({
                        top: box.top - labelRect.height,
                        left: box.left + (box.width / gridSize) * i - labelRect.width / 2,
                    });
                    // Bottom side
                    positions.push({
                        top: box.bottom,
                        left: box.left + (box.width / gridSize) * i - labelRect.width / 2,
                    });
                    // Left side
                    positions.push({
                        top: box.top + (box.height / gridSize) * i - labelRect.height / 2,
                        left: box.left - labelRect.width,
                    });
                    // Right side
                    positions.push({
                        top: box.top + (box.height / gridSize) * i - labelRect.height / 2,
                        left: box.right,
                    });
                }
                // Calculate score for each position
                const scores = positions.map((position) => {
                    let score = 0;
                    // Check if position is within bounds
                    if (position.top < 0 ||
                        position.top + labelRect.height > window.innerHeight ||
                        position.left < 0 ||
                        position.left + labelRect.width > window.innerWidth) {
                        score += Infinity; // Out of bounds, set score to infinity
                    }
                    else {
                        // Calculate overlap with other labels and bounding boxes
                        labels.concat(boundingBoxes).forEach((existing) => {
                            // Ignore bounding boxes that are fully covering the current box
                            if (existing.top <= box.top &&
                                existing.bottom >= box.bottom &&
                                existing.left <= box.left &&
                                existing.right >= box.right) {
                                return;
                            }
                            const overlapWidth = Math.max(0, Math.min(position.left + labelRect.width, existing.left + existing.width) - Math.max(position.left, existing.left));
                            const overlapHeight = Math.max(0, Math.min(position.top + labelRect.height, existing.top + existing.height) - Math.max(position.top, existing.top));
                            score += overlapWidth * overlapHeight; // Add overlap area to score
                        });
                    }
                    return score;
                });
                // Select position with lowest score
                const bestPosition = positions[scores.indexOf(Math.min(...scores))];
                // Set label position
                label.style.top = `${bestPosition.top - box.top}px`;
                label.style.left = `${bestPosition.left - box.left}px`;
                // Add the new label's position to the array
                labels.push({
                    top: bestPosition.top,
                    left: bestPosition.left,
                    right: bestPosition.left + labelRect.width,
                    bottom: bestPosition.top + labelRect.height,
                    width: labelRect.width,
                    height: labelRect.height,
                });
                element.setAttribute('data-SoM', `${i}`);
            }
        }
        getColorByLuminance(color) {
            return color.luminance() > 0.5 ? 'black' : 'white';
        }
    }

    var style = "som-wrapper {\n\tall: unset !important;\n}\n\n.SoM {\n\tposition: fixed;\n\tz-index: 2147483646;\n\tpointer-events: none;\n\tbackground-color: rgba(var(--SoM-color), 0.35);\n}\n\n.SoM.editable {\n\t/* Apply stripes effect to display that the element is editable, while keeping the same colors */\n\tbackground: repeating-linear-gradient(\n\t\t45deg,\n\t\trgba(var(--SoM-color), 0.15),\n\t\trgba(var(--SoM-color), 0.15) 10px,\n\t\trgba(var(--SoM-color), 0.35) 10px,\n\t\trgba(var(--SoM-color), 0.35) 20px\n\t);\n\n\t/* Add an outline to make the element more visible */\n\toutline: 2px solid rgba(var(--SoM-color), 0.7);\n}\n\n.SoM > .SoM--label {\n\tposition: absolute;\n\tpadding: 0 3px;\n\tfont-size: 16px;\n\tfont-weight: bold;\n\tline-height: 18.2px;\n\twhite-space: nowrap;\n\tfont-family: 'Courier New', Courier, monospace;\n\tbackground-color: rgba(var(--SoM-color), 0.7);\n}\n";

    class SoM {
        loader = new Loader();
        ui = new UI();
        async display() {
            this.log('Displaying...');
            const startTime = performance.now();
            const elements = await this.loader.loadElements();
            this.clear();
            this.ui.display(elements);
            this.log('Done!', `Took ${performance.now() - startTime}ms to display ${elements.length} elements.`);
        }
        clear() {
            // Remove all children of the wrapper
            const wrapper = document.querySelector('som-wrapper');
            if (wrapper) {
                wrapper.innerHTML = '';
            }
            document.querySelectorAll('[data-som]').forEach((element) => {
                element.removeAttribute('data-som');
            });
        }
        hide() {
            document
                .querySelectorAll('.SoM')
                .forEach((element) => (element.style.display = 'none'));
        }
        show() {
            document
                .querySelectorAll('.SoM')
                .forEach((element) => (element.style.display = 'block'));
        }
        resolve(id) {
            return document.querySelector(`[data-som="${id}"]`);
        }
        log(...args) {
            console.log('%cSoM', 'color: white; background: #007bff; padding: 2px 5px; border-radius: 5px;', ...args);
        }
    }
    // Load styles
    if (!document.getElementById('SoM-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'SoM-styles';
        styleElement.innerHTML = style;
        // Wait until head becomes available
        const interval = setInterval(() => {
            if (document.head) {
                clearInterval(interval);
                document.head.appendChild(styleElement);
            }
        }, 100);
    }
    window.SoM = new SoM();
    window.SoM.log('Ready!');

    window.addEventListener('message', (event) => {
        if (event.data.type === 'displaySoM') {
            if (window.SoM) {
                window.SoM.display().then(() => {
                    console.log('SOM displayed before capture');
                    window.postMessage({ type: 'SOM_BEFORE_CAPTURE_DONE' }, '*');
                });
            }
        } else if (event.data.type === 'clearSoM') {
            if (window.SoM) {
                window.SoM.clear().then(() => {
                    console.log('SOM cleared after capture');
                    window.postMessage({ type: 'SOM_AFTER_CAPTURE_DONE' }, '*');
                });
            }
        }
    });
}));
//# sourceMappingURL=SoM.js.map
