!function(t){"function"===typeof define&&define.amd?define(t):t()}((function(){"use strict";const t=["a:not(:has(img))","a img","button",'input:not([type="hidden"])',"select","textarea",'[tabindex]:not([tabindex="-1"])','[contenteditable="true"]',".btn",'[role="button"]','[role="link"]','[role="checkbox"]','[role="radio"]','[role="input"]','[role="menuitem"]','[role="menuitemcheckbox"]','[role="menuitemradio"]','[role="option"]','[role="switch"]','[role="tab"]','[role="treeitem"]','[role="gridcell"]','[role="search"]','[role="combobox"]','[role="listbox"]','[role="slider"]','[role="spinbutton"]'],e=['input[type="text"]','input[type="password"]','input[type="email"]','input[type="tel"]','input[type="number"]','input[type="search"]','input[type="url"]','input[type="date"]','input[type="time"]','input[type="datetime-local"]','input[type="month"]','input[type="week"]','input[type="color"]',"textarea",'[contenteditable="true"]'],i=.6,n=.1,o=.25;class r{}function s(t,e,i,n,o){a(t,e,i||0,n||t.length-1,o||l)}function a(t,e,i,n,o){for(;n>i;){if(n-i>600){var r=n-i+1,s=e-i+1,l=Math.log(r),c=.5*Math.exp(2*l/3),d=.5*Math.sqrt(l*c*(r-c)/r)*(s-r/2<0?-1:1);a(t,e,Math.max(i,Math.floor(e-s*c/r+d)),Math.min(n,Math.floor(e+(r-s)*c/r+d)),o)}var f=t[e],m=i,u=n;for(h(t,i,e),o(t[n],f)>0&&h(t,i,n);m<u;){for(h(t,m,u),m++,u--;o(t[m],f)<0;)m++;for(;o(t[u],f)>0;)u--}0===o(t[i],f)?h(t,i,u):h(t,++u,n),u<=e&&(i=u+1),e<=u&&(n=u-1)}}function h(t,e,i){var n=t[e];t[e]=t[i],t[i]=n}function l(t,e){return t<e?-1:t>e?1:0}class c{constructor(t=9){this._maxEntries=Math.max(4,t),this._minEntries=Math.max(2,Math.ceil(.4*this._maxEntries)),this.clear()}all(){return this._all(this.data,[])}search(t){let e=this.data;const i=[];if(!M(t,e))return i;const n=this.toBBox,o=[];for(;e;){for(let r=0;r<e.children.length;r++){const s=e.children[r],a=e.leaf?n(s):s;M(t,a)&&(e.leaf?i.push(s):y(t,a)?this._all(s,i):o.push(s))}e=o.pop()}return i}collides(t){let e=this.data;if(!M(t,e))return!1;const i=[];for(;e;){for(let n=0;n<e.children.length;n++){const o=e.children[n],r=e.leaf?this.toBBox(o):o;if(M(t,r)){if(e.leaf||y(t,r))return!0;i.push(o)}}e=i.pop()}return!1}load(t){if(!t||!t.length)return this;if(t.length<this._minEntries){for(let e=0;e<t.length;e++)this.insert(t[e]);return this}let e=this._build(t.slice(),0,t.length-1,0);if(this.data.children.length)if(this.data.height===e.height)this._splitRoot(this.data,e);else{if(this.data.height<e.height){const t=this.data;this.data=e,e=t}this._insert(e,this.data.height-e.height-1,!0)}else this.data=e;return this}insert(t){return t&&this._insert(t,this.data.height-1),this}clear(){return this.data=v([]),this}remove(t,e){if(!t)return this;let i=this.data;const n=this.toBBox(t),o=[],r=[];let s,a,h;for(;i||o.length;){if(i||(i=o.pop(),a=o[o.length-1],s=r.pop(),h=!0),i.leaf){const n=d(t,i.children,e);if(-1!==n)return i.children.splice(n,1),o.push(i),this._condense(o),this}h||i.leaf||!y(i,n)?a?(s++,i=a.children[s],h=!1):i=null:(o.push(i),r.push(s),s=0,a=i,i=i.children[0])}return this}toBBox(t){return t}compareMinX(t,e){return t.minX-e.minX}compareMinY(t,e){return t.minY-e.minY}toJSON(){return this.data}fromJSON(t){return this.data=t,this}_all(t,e){const i=[];for(;t;)t.leaf?e.push(...t.children):i.push(...t.children),t=i.pop();return e}_build(t,e,i,n){const o=i-e+1;let r,s=this._maxEntries;if(o<=s)return r=v(t.slice(e,i+1)),f(r,this.toBBox),r;n||(n=Math.ceil(Math.log(o)/Math.log(s)),s=Math.ceil(o/Math.pow(s,n-1))),r=v([]),r.leaf=!1,r.height=n;const a=Math.ceil(o/s),h=a*Math.ceil(Math.sqrt(s));S(t,e,i,h,this.compareMinX);for(let l=e;l<=i;l+=h){const e=Math.min(l+h-1,i);S(t,l,e,a,this.compareMinY);for(let i=l;i<=e;i+=a){const o=Math.min(i+a-1,e);r.children.push(this._build(t,i,o,n-1))}}return f(r,this.toBBox),r}_chooseSubtree(t,e,i,n){for(;n.push(e),!e.leaf&&n.length-1!==i;){let i,n=1/0,s=1/0;for(let a=0;a<e.children.length;a++){const h=e.children[a],l=b(h),c=(o=t,r=h,(Math.max(r.maxX,o.maxX)-Math.min(r.minX,o.minX))*(Math.max(r.maxY,o.maxY)-Math.min(r.minY,o.minY))-l);c<s?(s=c,n=l<n?l:n,i=h):c===s&&l<n&&(n=l,i=h)}e=i||e.children[0]}var o,r;return e}_insert(t,e,i){const n=i?t:this.toBBox(t),o=[],r=this._chooseSubtree(n,this.data,e,o);for(r.children.push(t),u(r,n);e>=0&&o[e].children.length>this._maxEntries;)this._split(o,e),e--;this._adjustParentBBoxes(n,o,e)}_split(t,e){const i=t[e],n=i.children.length,o=this._minEntries;this._chooseSplitAxis(i,o,n);const r=this._chooseSplitIndex(i,o,n),s=v(i.children.splice(r,i.children.length-r));s.height=i.height,s.leaf=i.leaf,f(i,this.toBBox),f(s,this.toBBox),e?t[e-1].children.push(s):this._splitRoot(i,s)}_splitRoot(t,e){this.data=v([t,e]),this.data.height=t.height+1,this.data.leaf=!1,f(this.data,this.toBBox)}_chooseSplitIndex(t,e,i){let n,o=1/0,r=1/0;for(let s=e;s<=i-e;s++){const e=m(t,0,s,this.toBBox),a=m(t,s,i,this.toBBox),h=x(e,a),l=b(e)+b(a);h<o?(o=h,n=s,r=l<r?l:r):h===o&&l<r&&(r=l,n=s)}return n||i-e}_chooseSplitAxis(t,e,i){const n=t.leaf?this.compareMinX:p,o=t.leaf?this.compareMinY:g;this._allDistMargin(t,e,i,n)<this._allDistMargin(t,e,i,o)&&t.children.sort(n)}_allDistMargin(t,e,i,n){t.children.sort(n);const o=this.toBBox,r=m(t,0,e,o),s=m(t,i-e,i,o);let a=w(r)+w(s);for(let h=e;h<i-e;h++){const e=t.children[h];u(r,t.leaf?o(e):e),a+=w(r)}for(let h=i-e-1;h>=e;h--){const e=t.children[h];u(s,t.leaf?o(e):e),a+=w(s)}return a}_adjustParentBBoxes(t,e,i){for(let n=i;n>=0;n--)u(e[n],t)}_condense(t){for(let e,i=t.length-1;i>=0;i--)0===t[i].children.length?i>0?(e=t[i-1].children,e.splice(e.indexOf(t[i]),1)):this.clear():f(t[i],this.toBBox)}}function d(t,e,i){if(!i)return e.indexOf(t);for(let n=0;n<e.length;n++)if(i(t,e[n]))return n;return-1}function f(t,e){m(t,0,t.children.length,e,t)}function m(t,e,i,n,o){o||(o=v(null)),o.minX=1/0,o.minY=1/0,o.maxX=-1/0,o.maxY=-1/0;for(let r=e;r<i;r++){const e=t.children[r];u(o,t.leaf?n(e):e)}return o}function u(t,e){return t.minX=Math.min(t.minX,e.minX),t.minY=Math.min(t.minY,e.minY),t.maxX=Math.max(t.maxX,e.maxX),t.maxY=Math.max(t.maxY,e.maxY),t}function p(t,e){return t.minX-e.minX}function g(t,e){return t.minY-e.minY}function b(t){return(t.maxX-t.minX)*(t.maxY-t.minY)}function w(t){return t.maxX-t.minX+(t.maxY-t.minY)}function x(t,e){const i=Math.max(t.minX,e.minX),n=Math.max(t.minY,e.minY),o=Math.min(t.maxX,e.maxX),r=Math.min(t.maxY,e.maxY);return Math.max(0,o-i)*Math.max(0,r-n)}function y(t,e){return t.minX<=e.minX&&t.minY<=e.minY&&e.maxX<=t.maxX&&e.maxY<=t.maxY}function M(t,e){return e.minX<=t.maxX&&e.minY<=t.maxY&&e.maxX>=t.minX&&e.maxY>=t.minY}function v(t){return{children:t,height:1,leaf:!0,minX:1/0,minY:1/0,maxX:-1/0,maxY:-1/0}}function S(t,e,i,n,o){const r=[e,i];for(;r.length;){if((i=r.pop())-(e=r.pop())<=n)continue;const a=e+Math.ceil((i-e)/n/2)*n;s(t,a,e,i,o),r.push(e,a,a,i)}}class k{bounds;tree=new c;constructor(t){this.bounds=t}insert(t){this.bounds.containsThreshold(t,i)&&this.tree.insert(t.data)}insertAll(t){const e=t.filter((t=>this.bounds.containsThreshold(t,i))).map((t=>t.data));this.tree.load(e)}query(t){return this.tree.search(t.data).flatMap((t=>t.elements))}}class C{x;y;width;height;elements;constructor(t,e,i,n,o=[]){this.x=t,this.y=e,this.width=i,this.height=n,this.elements=o}get area(){return this.width*this.height}get data(){return{minX:this.x,minY:this.y,maxX:this.x+this.width,maxY:this.y+this.height,elements:this.elements}}disjoint(t){return Math.abs(this.x-t.x)>n*this.x||Math.abs(this.y-t.y)>n*this.y||Math.abs(this.width-t.width)>n*this.width||Math.abs(this.height-t.height)>n*this.height}join(t){const e=Math.min(this.x,t.x),i=Math.min(this.y,t.y),n=Math.max(this.x+this.width,t.x+t.width)-e,o=Math.max(this.y+this.height,t.y+t.height)-i;return new C(e,i,n,o,[...this.elements,...t.elements])}contains(t){return t.x>=this.x&&t.x+t.width<=this.x+this.width&&t.y>=this.y&&t.y+t.height<=this.y+this.height}containsThreshold(t,e){const i=Math.max(this.x,t.x),n=Math.max(this.y,t.y);return(Math.min(this.x+this.width,t.x+t.width)-i)*(Math.min(this.y+this.height,t.y+t.height)-n)>=t.width*t.height*e}intersects(t){return!(t.x>this.x+this.width||t.x+t.width<this.x||t.y>this.y+this.height||t.y+t.height<this.y)}}function E(t){if(0===t.offsetWidth&&0===t.offsetHeight)return!1;const e=t.getBoundingClientRect();if(e.width<=0||e.height<=0)return!1;const i=window.getComputedStyle(t);if("none"===i.display||"hidden"===i.visibility||"none"===i.pointerEvents)return!1;let n=t.parentElement;for(;null!==n;){const t=window.getComputedStyle(n);if("none"===t.display||"hidden"===t.visibility||"none"===t.pointerEvents)return!1;n=n.parentElement}return!0}class B{element;canvas;ctx;rect;visibleRect;constructor(t){this.element=t,this.element=t,this.rect=this.element.getBoundingClientRect(),this.canvas=new OffscreenCanvas(this.rect.width,this.rect.height),this.ctx=this.canvas.getContext("2d",{willReadFrequently:!0}),this.ctx.imageSmoothingEnabled=!1,this.visibleRect={top:Math.max(0,this.rect.top),left:Math.max(0,this.rect.left),bottom:Math.min(window.innerHeight,this.rect.bottom),right:Math.min(window.innerWidth,this.rect.right),width:this.rect.width,height:this.rect.height},this.visibleRect.width=this.visibleRect.right-this.visibleRect.left,this.visibleRect.height=this.visibleRect.bottom-this.visibleRect.top}async eval(t){this.ctx.fillStyle="black",this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height),this.drawElement(this.element,"white");const e={top:this.visibleRect.top-this.rect.top,bottom:this.visibleRect.bottom-this.rect.top,left:this.visibleRect.left-this.rect.left,right:this.visibleRect.right-this.rect.left,width:this.canvas.width,height:this.canvas.height},i=await this.countVisiblePixels(e);if(0===i)return 0;const n=this.getIntersectingElements(t);for(const o of n)this.drawElement(o,"black");return await this.countVisiblePixels(e)/i}getIntersectingElements(t){const e=new C(this.rect.left,this.rect.right,this.rect.width,this.rect.height,[this.element]),i=t.query(e),n=document.elementsFromPoint(this.rect.left+this.rect.width/2,this.rect.top+this.rect.height/2);return i.concat(n).filter(((t,e,i)=>i.indexOf(t)===e&&E(t)&&function(t,e){function i(t,e){for(;t;){const i=window.getComputedStyle(t).zIndex;if("auto"!==i){const n=parseInt(i,10);return t.contains(e)||isNaN(n)?0:n}t=t.parentElement}return 0}const n=i(t,e),o=i(e,t),r=t.compareDocumentPosition(e);return!(r&Node.DOCUMENT_POSITION_CONTAINS||r&Node.DOCUMENT_POSITION_CONTAINED_BY)&&(n!==o?n<o:!!(r&Node.DOCUMENT_POSITION_PRECEDING))}(this.element,t)))}async countVisiblePixels(t){const e=this.ctx.getImageData(t.left,t.top,t.width,t.height);let i=0;for(let n=0;n<e.data.length;n+=4){255===e.data[n+1]&&i++}return i}drawElement(t,e="black"){const i=t.getBoundingClientRect(),n=window.getComputedStyle(t),o=n.borderRadius?.split(" ").map((t=>parseFloat(t))),r=n.clipPath,s={top:i.top-this.rect.top,bottom:i.bottom-this.rect.top,left:i.left-this.rect.left,right:i.right-this.rect.left,width:i.width,height:i.height};if(s.width=s.right-s.left,s.height=s.bottom-s.top,this.ctx.fillStyle=e,r&&"none"!==r){r.split(/,| /).forEach((t=>{const e=t.trim().match(/^([a-z]+)\((.*)\)$/);if(e)if("polygon"===e[0]){const e=this.pathFromPolygon(t,i);this.ctx.fill(e)}else console.log("Unknown clip path kind: "+e)}))}else if(o){const t=new Path2D;1===o.length&&(o[1]=o[0]),2===o.length&&(o[2]=o[0]),3===o.length&&(o[3]=o[1]),t.moveTo(s.left+o[0],s.top),t.arcTo(s.right,s.top,s.right,s.bottom,o[1]),t.arcTo(s.right,s.bottom,s.left,s.bottom,o[2]),t.arcTo(s.left,s.bottom,s.left,s.top,o[3]),t.arcTo(s.left,s.top,s.right,s.top,o[0]),t.closePath(),this.ctx.fill(t)}else this.ctx.fillRect(s.left,s.top,s.width,s.height)}pathFromPolygon(t,e){if(!t||!t.match(/^polygon\((.*)\)$/))throw new Error("Invalid polygon format: "+t);const i=new Path2D,n=t.match(/\d+(\.\d+)?%/g);if(n&&n.length>=2){const t=parseFloat(n[0]),o=parseFloat(n[1]);i.moveTo(t*e.width/100,o*e.height/100);for(let r=2;r<n.length;r+=2){const t=parseFloat(n[r]),o=parseFloat(n[r+1]);i.lineTo(t*e.width/100,o*e.height/100)}i.closePath()}return i}}class _ extends r{dt;async apply(t){this.dt=this.buildDOMTree();const e=await Promise.all([this.applyScoped(t.fixed),this.applyScoped(t.unknown)]);return{fixed:e[0],unknown:e[1]}}async applyScoped(t){return(await Promise.all(Array.from({length:Math.ceil(t.length/10)}).map((async(e,i)=>{const n=t.slice(10*i,10*(i+1)).filter((t=>E(t))),o=[];for(const t of n){await this.isDeepVisible(t)&&o.push(t)}return o})))).flat()}buildDOMTree(){const t=new C(0,0,window.innerWidth,window.innerHeight),e=new k(t),i=document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT),n=[];let o=i.currentNode;for(;o;){const t=o;if(E(t)){const e=t.getBoundingClientRect();n.push(new C(e.left,e.top,e.width,e.height,[t]))}o=i.nextNode()}return e.insertAll(n),e}async isDeepVisible(t){return new Promise((e=>{const n=new IntersectionObserver((async o=>{const r=o[0];if(n.disconnect(),r.intersectionRatio<i)return void e(!1);const s=t.getBoundingClientRect();if(s.width>=.8*window.innerWidth||s.height>=.8*window.innerHeight)return void e(!1);const a=new B(t),h=await a.eval(this.dt);e(h>=i)}));n.observe(t)}))}}const R=["a","button","input","select","textarea"];class Y extends r{async apply(t){const e=t.fixed.concat(t.unknown),{top:i,others:n}=this.getTopLevelElements(e),o=await Promise.all(i.map((async t=>this.compareTopWithChildren(t,n))));return{fixed:t.fixed,unknown:o.flat().filter((e=>-1===t.fixed.indexOf(e)))}}async compareTopWithChildren(t,e){if(R.some((e=>t.matches(e))))return[t];const i=this.getBranches(t,e),n=t.getBoundingClientRect();if(i.length<=1)return[t];const o=(await Promise.all(i.map((async t=>{const e=t.top.getBoundingClientRect();return e.width/n.width<.9&&e.height/n.height<.9?[]:0===t.children.length?[t.top]:this.compareTopWithChildren(t.top,t.children)})))).flat();return o.length>3?o:[t,...o]}getBranches(t,e){const i=this.getFirstHitChildren(t,e);return i.map((t=>{const n=e.filter((e=>!i.includes(e)&&t.contains(e)));return{top:t,children:n}}))}getFirstHitChildren(t,e){const i=t.querySelectorAll(":scope > *"),n=Array.from(i).filter((t=>e.includes(t)));return n.length>0?n:Array.from(i).flatMap((t=>this.getFirstHitChildren(t,e)))}getTopLevelElements(t){const e=[],i=[];for(const n of t)t.some((t=>t!==n&&t.contains(n)))?i.push(n):e.push(n);return{top:e,others:i}}}class X{filters={visibility:new _,nesting:new Y};async loadElements(){const i=t.join(",");let n=Array.from(document.querySelectorAll(i));const o=this.shadowRoots();for(let t=0;t<o.length;t++)n=n.concat(Array.from(o[t].querySelectorAll(i)));let r=[];const s=document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT,{acceptNode:()=>NodeFilter.FILTER_ACCEPT});let a;for(;a=s.nextNode();){const t=a;t.matches(i)||"pointer"!==window.getComputedStyle(t).cursor||r.push(t)}r=Array.from(r).filter(((t,e,i)=>i.indexOf(t)===e)).filter((t=>!t.closest("svg")&&!n.some((e=>e.contains(t)))));let h={fixed:n,unknown:r};return console.groupCollapsed("Elements"),console.log("Before filters",h),h=await this.filters.visibility.apply(h),console.log("After visibility filter",h),h=await this.filters.nesting.apply(h),console.log("After nesting filter",h),console.groupEnd(),h.fixed.concat(h.unknown).reduce(((t,i)=>{const n=i.getBoundingClientRect(),o=t.filter((t=>t.getBoundingClientRect().top===n.top&&t.getBoundingClientRect().left===n.left));if(o.length>0){const n=o.find((t=>t.isContentEditable||e.some((e=>t.matches(e)))));return n?t.filter((t=>t!==n)).concat(i):t}return t.concat(i)}),[])}shadowRoots(){const t=[],e=document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT,{acceptNode:t=>NodeFilter.FILTER_ACCEPT});let i;for(;i=e.nextNode();)i&&i.shadowRoot&&t.push(i.shadowRoot);return t}}class T{contrastColor(t,e){const i=window.getComputedStyle(t),n=N.fromCSS(i.backgroundColor);return this.getBestContrastColor([n,...e])}getBestContrastColor(t){const e=t.filter((t=>t.a>0)).map((t=>t.complimentary()));let i;return i=0===e.length?this.generateColor():this.getAverageColor(e),0===i.r&&0===i.g&&0===i.b&&(i=this.generateColor()),i.luminance()>.7?i=i.withLuminance(.7):i.luminance()<o&&(i=i.withLuminance(o)),i.saturation()<.3&&(i=i.withSaturation(.3)),i}generateColor(){return N.fromHSL({h:Math.random(),s:1,l:Math.random()*(.7-o)+o})}getAverageColor(t){const e=t.map((t=>t.toHsl())),i=e.reduce(((t,e)=>(t.h+=e.h,t.s+=e.s,t.l+=e.l,t)),{h:0,s:0,l:0});return i.h/=e.length,i.s/=e.length,i.l/=e.length,N.fromHSL(i)}}class N{r;g;b;a;constructor(t,e,i,n=255){if(this.r=t,this.g=e,this.b=i,this.a=n,t<0||t>255)throw new Error(`Invalid red value: ${t}`);if(e<0||e>255)throw new Error(`Invalid green value: ${e}`);if(i<0||i>255)throw new Error(`Invalid blue value: ${i}`);if(n<0||n>255)throw new Error(`Invalid alpha value: ${n}`);this.r=Math.round(t),this.g=Math.round(e),this.b=Math.round(i),this.a=Math.round(n)}static fromCSS(t){if(t.startsWith("#"))return N.fromHex(t);if(t.startsWith("rgb")){const e=t.replace(/rgba?\(/,"").replace(")","").split(",").map((t=>parseInt(t.trim())));return new N(...e)}if(t.startsWith("hsl")){const e=t.replace(/hsla?\(/,"").replace(")","").split(",").map((t=>parseFloat(t.trim())));return N.fromHSL({h:e[0],s:e[1],l:e[2]})}const e=I[t.toLowerCase()];if(e)return N.fromHex(e);throw new Error(`Unknown color format: ${t}`)}static fromHex(t){3===(t=t.replace("#","")).length&&(t=t.split("").map((t=>t+t)).join(""));const e=parseInt(t.substring(0,2),16),i=parseInt(t.substring(2,4),16),n=parseInt(t.substring(4,6),16);if(8===t.length){const o=parseInt(t.substring(6,8),16);return new N(e,i,n,o)}return new N(e,i,n)}static fromHSL(t){const e=t.h,i=t.s,n=t.l;let o,r,s;if(0===i)o=r=s=n;else{const t=(t,e,i)=>(i<0&&(i+=1),i>1&&(i-=1),i<1/6?t+6*(e-t)*i:i<.5?e:i<2/3?t+(e-t)*(2/3-i)*6:t),a=n<.5?n*(1+i):n+i-n*i,h=2*n-a;o=t(h,a,e+1/3),r=t(h,a,e),s=t(h,a,e-1/3)}return new N(255*o,255*r,255*s)}luminance(){const t=[this.r/255,this.g/255,this.b/255].map((t=>t<=.03928?t/12.92:Math.pow((t+.055)/1.055,2.4)));return.2126*t[0]+.7152*t[1]+.0722*t[2]}withLuminance(t){const e=this.luminance();if(0===e)return new N(0,0,0,this.a);const i=t/e,n=Math.min(255,this.r*i),o=Math.min(255,this.g*i),r=Math.min(255,this.b*i);return new N(n,o,r,this.a)}saturation(){return this.toHsl().s}withSaturation(t){const e=this.toHsl();return e.s=t,N.fromHSL(e)}contrast(t){const e=this.luminance(),i=t.luminance();return(Math.max(e,i)+.05)/(Math.min(e,i)+.05)}complimentary(){const t=this.toHsl();return t.h=(t.h+.5)%1,N.fromHSL(t)}toHex(){const t=this.r.toString(16).padStart(2,"0"),e=this.g.toString(16).padStart(2,"0"),i=this.b.toString(16).padStart(2,"0");if(this.a<255){return`#${t}${e}${i}${this.a.toString(16).padStart(2,"0")}`}return`#${t}${e}${i}`}toHsl(){const t=this.r/255,e=this.g/255,i=this.b/255,n=Math.max(t,e,i),o=Math.min(t,e,i);let r=(n+o)/2,s=(n+o)/2,a=(n+o)/2;if(n===o)r=s=0;else{const h=n-o;switch(s=a>.5?h/(2-n-o):h/(n+o),n){case t:r=(e-i)/h+(e<i?6:0);break;case e:r=(i-t)/h+2;break;case i:r=(t-e)/h+4}r/=6}return{h:r,s:s,l:a,a:this.a/255}}toString(){return this.toHex()}}const I={aliceblue:"#f0f8ff",antiquewhite:"#faebd7",aqua:"#00ffff",aquamarine:"#7fffd4",azure:"#f0ffff",beige:"#f5f5dc",bisque:"#ffe4c4",black:"#000000",blanchedalmond:"#ffebcd",blue:"#0000ff",blueviolet:"#8a2be2",brown:"#a52a2a",burlywood:"#deb887",cadetblue:"#5f9ea0",chartreuse:"#7fff00",chocolate:"#d2691e",coral:"#ff7f50",cornflowerblue:"#6495ed",cornsilk:"#fff8dc",crimson:"#dc143c",cyan:"#00ffff",darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",darkgray:"#a9a9a9",darkgreen:"#006400",darkkhaki:"#bdb76b",darkmagenta:"#8b008b",darkolivegreen:"#556b2f",darkorange:"#ff8c00",darkorchid:"#9932cc",darkred:"#8b0000",darksalmon:"#e9967a",darkseagreen:"#8fbc8f",darkslateblue:"#483d8b",darkslategray:"#2f4f4f",darkturquoise:"#00ced1",darkviolet:"#9400d3",deeppink:"#ff1493",deepskyblue:"#00bfff",dimgray:"#696969",dodgerblue:"#1e90ff",firebrick:"#b22222",floralwhite:"#fffaf0",forestgreen:"#228b22",fuchsia:"#ff00ff",gainsboro:"#dcdcdc",ghostwhite:"#f8f8ff",gold:"#ffd700",goldenrod:"#daa520",gray:"#808080",green:"#008000",greenyellow:"#adff2f",honeydew:"#f0fff0",hotpink:"#ff69b4","indianred ":"#cd5c5c",indigo:"#4b0082",ivory:"#fffff0",khaki:"#f0e68c",lavender:"#e6e6fa",lavenderblush:"#fff0f5",lawngreen:"#7cfc00",lemonchiffon:"#fffacd",lightblue:"#add8e6",lightcoral:"#f08080",lightcyan:"#e0ffff",lightgoldenrodyellow:"#fafad2",lightgrey:"#d3d3d3",lightgreen:"#90ee90",lightpink:"#ffb6c1",lightsalmon:"#ffa07a",lightseagreen:"#20b2aa",lightskyblue:"#87cefa",lightslategray:"#778899",lightsteelblue:"#b0c4de",lightyellow:"#ffffe0",lime:"#00ff00",limegreen:"#32cd32",linen:"#faf0e6",magenta:"#ff00ff",maroon:"#800000",mediumaquamarine:"#66cdaa",mediumblue:"#0000cd",mediumorchid:"#ba55d3",mediumpurple:"#9370d8",mediumseagreen:"#3cb371",mediumslateblue:"#7b68ee",mediumspringgreen:"#00fa9a",mediumturquoise:"#48d1cc",mediumvioletred:"#c71585",midnightblue:"#191970",mintcream:"#f5fffa",mistyrose:"#ffe4e1",moccasin:"#ffe4b5",navajowhite:"#ffdead",navy:"#000080",oldlace:"#fdf5e6",olive:"#808000",olivedrab:"#6b8e23",orange:"#ffa500",orangered:"#ff4500",orchid:"#da70d6",palegoldenrod:"#eee8aa",palegreen:"#98fb98",paleturquoise:"#afeeee",palevioletred:"#d87093",papayawhip:"#ffefd5",peachpuff:"#ffdab9",peru:"#cd853f",pink:"#ffc0cb",plum:"#dda0dd",powderblue:"#b0e0e6",purple:"#800080",rebeccapurple:"#663399",red:"#ff0000",rosybrown:"#bc8f8f",royalblue:"#4169e1",saddlebrown:"#8b4513",salmon:"#fa8072",sandybrown:"#f4a460",seagreen:"#2e8b57",seashell:"#fff5ee",sienna:"#a0522d",silver:"#c0c0c0",skyblue:"#87ceeb",slateblue:"#6a5acd",slategray:"#708090",snow:"#fffafa",springgreen:"#00ff7f",steelblue:"#4682b4",tan:"#d2b48c",teal:"#008080",thistle:"#d8bfd8",tomato:"#ff6347",turquoise:"#40e0d0",violet:"#ee82ee",wheat:"#f5deb3",white:"#ffffff",whitesmoke:"#f5f5f5",yellow:"#ffff00",yellowgreen:"#9acd32"};class H{colors=new T;display(t){let i=document.querySelector("som-wrapper");i||(i=document.createElement("som-wrapper"),document.body.appendChild(i));const n=[],o=[],r=[];for(let s=0;s<t.length;s++){const n=t[s],a=n.getBoundingClientRect(),h=document.createElement("som-box");h.style.left=`${a.left}px`,h.style.top=`${a.top}px`,h.style.width=`${a.width}px`,h.style.height=`${a.height}px`,h.classList.add("SoM"),(n.isContentEditable||e.some((t=>n.matches(t))))&&h.classList.add("editable");const l=o.filter((t=>[Math.sqrt(Math.pow(a.left-t.left,2)+Math.pow(a.top-t.top,2)),Math.sqrt(Math.pow(a.right-t.right,2)+Math.pow(a.top-t.top,2)),Math.sqrt(Math.pow(a.left-t.left,2)+Math.pow(a.bottom-t.bottom,2)),Math.sqrt(Math.pow(a.right-t.right,2)+Math.pow(a.bottom-t.bottom,2))].some((t=>t<200)))).map((t=>t.color)),c=this.colors.contrastColor(n,l);h.style.setProperty("--SoM-color",`${c.r}, ${c.g}, ${c.b}`),i.appendChild(h),o.push({top:a.top,bottom:a.bottom,left:a.left,right:a.right,width:a.width,height:a.height,color:c}),r.push(h)}for(let e=0;e<t.length;e++){const i=t[e],s=o[e],a=document.createElement("som-label");a.textContent=`${e}`,a.style.color=this.getColorByLuminance(s.color),a.classList.add("SoM--label"),r[e].appendChild(a);const h=a.getBoundingClientRect(),l=10,c=[];for(let t=0;t<=l;t++)c.push({top:s.top-h.height,left:s.left+s.width/l*t-h.width/2}),c.push({top:s.bottom,left:s.left+s.width/l*t-h.width/2}),c.push({top:s.top+s.height/l*t-h.height/2,left:s.left-h.width}),c.push({top:s.top+s.height/l*t-h.height/2,left:s.right});const d=c.map((t=>{let e=0;return t.top<0||t.top+h.height>window.innerHeight||t.left<0||t.left+h.width>window.innerWidth?e+=1/0:n.concat(o).forEach((i=>{if(i.top<=s.top&&i.bottom>=s.bottom&&i.left<=s.left&&i.right>=s.right)return;const n=Math.max(0,Math.min(t.left+h.width,i.left+i.width)-Math.max(t.left,i.left)),o=Math.max(0,Math.min(t.top+h.height,i.top+i.height)-Math.max(t.top,i.top));e+=n*o})),e})),f=c[d.indexOf(Math.min(...d))];a.style.top=f.top-s.top+"px",a.style.left=f.left-s.left+"px",n.push({top:f.top,left:f.left,right:f.left+h.width,bottom:f.top+h.height,width:h.width,height:h.height}),i.setAttribute("data-SoM",`${e}`)}}getColorByLuminance(t){return t.luminance()>.5?"black":"white"}}if(!document.getElementById("SoM-styles")){const t=document.createElement("style");t.id="SoM-styles",t.innerHTML="som-wrapper {\n\tall: unset !important;\n}\n\n.SoM {\n\tposition: fixed;\n\tz-index: 2147483646;\n\tpointer-events: none;\n\tbackground-color: rgba(var(--SoM-color), 0.35);\n}\n\n.SoM.editable {\n\t/* Apply stripes effect to display that the element is editable, while keeping the same colors */\n\tbackground: repeating-linear-gradient(\n\t\t45deg,\n\t\trgba(var(--SoM-color), 0.15),\n\t\trgba(var(--SoM-color), 0.15) 10px,\n\t\trgba(var(--SoM-color), 0.35) 10px,\n\t\trgba(var(--SoM-color), 0.35) 20px\n\t);\n\n\t/* Add an outline to make the element more visible */\n\toutline: 2px solid rgba(var(--SoM-color), 0.7);\n}\n\n.SoM > .SoM--label {\n\tposition: absolute;\n\tpadding: 0 3px;\n\tfont-size: 16px;\n\tfont-weight: bold;\n\tline-height: 18.2px;\n\twhite-space: nowrap;\n\tfont-family: 'Courier New', Courier, monospace;\n\tbackground-color: rgba(var(--SoM-color), 0.7);\n}\n";const e=setInterval((()=>{document.head&&(clearInterval(e),document.head.appendChild(t))}),100)}window.SoM=new class{loader=new X;ui=new H;async display(){this.log("Displaying...");const t=performance.now(),e=await this.loader.loadElements();this.clear(),this.ui.display(e),this.log("Done!",`Took ${performance.now()-t}ms to display ${e.length} elements.`)}clear(){const t=document.querySelector("som-wrapper");t&&(t.innerHTML=""),document.querySelectorAll("[data-som]").forEach((t=>{t.removeAttribute("data-som")}))}hide(){document.querySelectorAll(".SoM").forEach((t=>t.style.display="none"))}show(){document.querySelectorAll(".SoM").forEach((t=>t.style.display="block"))}resolve(t){return document.querySelector(`[data-som="${t}"]`)}log(...t){console.log("%cSoM","color: white; background: #007bff; padding: 2px 5px; border-radius: 5px;",...t)}},window.SoM.log("Ready!")}));