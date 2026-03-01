var u={},N=(k,b,M)=>(u.__chunk_96834=(_,S,v)=>{"use strict";var x=Object.create,a=Object.defineProperty,y=Object.getOwnPropertyDescriptor,c=Object.getOwnPropertyNames,O=Object.getPrototypeOf,j=Object.prototype.hasOwnProperty,i=(e,t,n,o)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of c(t))j.call(e,r)||r===n||a(e,r,{get:()=>t[r],enumerable:!(o=y(t,r))||o.enumerable});return e},w=((e,t)=>function(){return t||(0,e[c(e)[0]])((t={exports:{}}).exports,t),t.exports})({"../../node_modules/dedent-tabs/dist/dedent-tabs.js"(e){Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(t){for(var n=typeof t=="string"?[t]:t.raw,o="",r=0;r<n.length;r++)if(o+=n[r].replace(/\\\n[ \t]*/g,"").replace(/\\`/g,"`").replace(/\\\$/g,"$").replace(/\\\{/g,"{"),r<(1>=arguments.length?0:arguments.length-1)){var P=o.substring(o.lastIndexOf(`
`)+1).match(/^(\s*)\S?/);o+=((1>r+1||arguments.length<=r+1?void 0:arguments[r+1])+"").replace(/\n/g,`
`+P[1])}var g=o.split(`
`),l=null;if(g.forEach(function(s){var R=Math.min,h=s.match(/^(\s+)\S+/);if(h){var m=h[1].length;l=l?R(l,m):m}}),l!==null){var C=l;o=g.map(function(s){return s[0]===" "||s[0]==="	"?s.slice(C):s}).join(`
`)}return o.trim().replace(/\\n/g,`
`)}}}),d={};((e,t)=>{for(var n in t)a(e,n,{get:t[n],enumerable:!0})})(d,{getOptionalRequestContext:()=>f,getRequestContext:()=>E}),_.exports=i(a({},"__esModule",{value:!0}),d),v(33010);var p=((e,t,n)=>(n=e!=null?x(O(e)):{},i(!t&&e&&e.__esModule?n:a(n,"default",{value:e,enumerable:!0}),e)))(w()),q=Symbol.for("__cloudflare-request-context__");function f(){let e=b[q];if((process?.release?.name==="node"?"nodejs":"edge")=="nodejs")throw Error(p.default`
			\`getRequestContext\` and \`getOptionalRequestContext\` can only be run
			inside the edge runtime, so please make sure to have included
			\`export const runtime = 'edge'\` in all the routes using such functions
			(regardless of whether they are used directly or indirectly through imports).
		`);return e}function E(){let e=f();if(!e)throw process?.env?.NEXT_PHASE==="phase-production-build"?Error(p.default`
				\n\`getRequestContext\` is being called at the top level of a route file, this is not supported
				for more details see https://developers.cloudflare.com/pages/framework-guides/nextjs/ssr/troubleshooting/#top-level-getrequestcontext \n
			`):Error("Failed to retrieve the Cloudflare request context.");return e}},u.__chunk_33010=()=>{},u);export{N as __getNamedExports};
