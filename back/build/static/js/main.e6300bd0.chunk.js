(this["webpackJsonppaku24-confirmator-front"]=this["webpackJsonppaku24-confirmator-front"]||[]).push([[0],{135:function(e,t,a){},237:function(e,t,a){},238:function(e,t,a){},239:function(e,t,a){"use strict";a.r(t);var n=a(1),r=a(0),c=a.n(r),i=a(15),s=a.n(i),o=a(25),l=a(11),u=a(8),d=a.n(u),j=a(14),m=a(17),p=a(119),b=a(39),h=a(12),f=a(24),x=a(243),O=(a(135),a(287)),v=a(277),g=a(286);function y(e){var t=e.value,a=e.label,c=e.name,i=e.custom,s=e.handleChange,o=e.disabled,u=Object(r.useState)(!1),d=Object(l.a)(u,2)[1],j=a.toLowerCase(),p=Object(m.g)();return Object(n.jsxs)(n.Fragment,{children:[Object(n.jsxs)(v.a,{disabled:o,className:"button-info",variant:"outlined",onClick:function(){d(!0),p.push(i?"/custom/".concat(j):"/edit/".concat(j))},children:[a,"to:",t]}),Object(n.jsx)(m.b,{path:["/custom/".concat(j),"/edit/".concat(j)],children:Object(n.jsx)(O.a,{open:!0,onClose:function(){d(!1),p.push(i?"/custom/":"/")},disableScrollLock:!0,children:Object(n.jsx)("div",{style:{position:"absolute",maxWidth:500,minWidth:300,padding:20,backgroundColor:"white",left:"50%",top:"50%",transform:"translate(-50%, -50%)"},children:Object(n.jsx)(g.a,{label:a,name:c,variant:"outlined",onChange:s,value:t,type:"Email"===a?a:"",autoFocus:!0})})})})]})}var C=a(290),k=a(284),S=a(283),w=a(282),N=a(40),T=a(109),E=a(35),A=a(110),I=a.n(A);function L(e){var t=e.handleClick;return Object(n.jsxs)(v.a,{className:"button-one-third flex-item",variant:"text",size:"small",onClick:t,children:["Transform ",Object(n.jsx)(I.a,{})]})}function D(e){var t,a=e.order,r=e.handleChange,c=e.handleClick,i={marginTop:5},s={marginLeft:5,marginRight:5};return Object(n.jsxs)("div",{className:"basic-flex",style:{marginTop:"15px"},children:[Object(n.jsx)(g.a,{fullWidth:!0,style:s,className:"flex-item",name:"ISODate",value:null===a||void 0===a||null===(t=a.date)||void 0===t?void 0:t.ISODate,onChange:r,type:"date"}),Object(n.jsxs)("div",{className:"flex-100-space-between flex-item",style:s,children:[Object(n.jsx)(g.a,{className:"time-duration",style:Object(h.a)(Object(h.a)({},s),{},{paddingRight:10}),name:"time",value:null===a||void 0===a?void 0:a.time,onChange:r,inputProps:{step:"900"},type:"time"}),Object(n.jsxs)(T.a,{className:"time-duration",style:Object(h.a)(Object(h.a)({},s),{},{paddingLeft:10}),name:"duration",value:null===a||void 0===a?void 0:a.duration,onChange:r,children:[Object(n.jsx)("option",{value:1,children:"1h"}),Object(n.jsx)("option",{value:1.5,children:"1.5h"}),Object(n.jsx)("option",{value:2,children:"2h"}),Object(n.jsx)("option",{value:2.5,children:"2.5h"}),Object(n.jsx)("option",{value:3,children:"3h"}),Object(n.jsx)("option",{value:3.5,children:"3.5h"}),Object(n.jsx)("option",{value:4,children:"4h"}),Object(n.jsx)("option",{value:4.5,children:"4.5h"}),Object(n.jsx)("option",{value:5,children:"5h"}),Object(n.jsx)("option",{value:5.5,children:"5.5h"}),Object(n.jsx)("option",{value:6,children:"6h"}),Object(n.jsx)("option",{value:6.5,children:"6.5h"}),Object(n.jsx)("option",{value:7,children:"7h"}),Object(n.jsx)("option",{value:7.5,children:"7.5h"}),Object(n.jsx)("option",{value:8,children:"8h"}),Object(n.jsx)("option",{value:8.5,children:"8.5h"}),Object(n.jsx)("option",{value:9,children:"9h"}),Object(n.jsx)("option",{value:9.5,children:"9.5h"}),Object(n.jsx)("option",{value:10,children:"10h"})]})]}),Object(n.jsx)(T.a,{fullWidth:!0,style:s,className:"flex-item",name:"serviceName",value:null===a||void 0===a?void 0:a.serviceName,onChange:r,children:E.map((function(e){return Object(n.jsx)("option",{value:e.name,children:e.name},e.id)}))}),Object(n.jsxs)(T.a,{fullWidth:!0,style:s,className:"flex-item",name:"paymentType",value:null===a||void 0===a?void 0:a.paymentType,onChange:r,children:[Object(n.jsx)("option",{value:"Maksukortti",children:"Maksukortti"}),Object(n.jsx)("option",{value:"K\xe4teinen",children:"K\xe4teinen"}),Object(n.jsx)("option",{value:"Lasku",children:"Lasku"})]}),Object(n.jsx)(g.a,{fullWidth:!0,style:i,className:"flex-item",required:!0,name:"address",value:null===a||void 0===a?void 0:a.address,onChange:r,label:"Address",variant:"outlined",size:"small"}),Object(n.jsx)(g.a,{fullWidth:!0,multiline:!0,style:i,className:"flex-item",name:"destination",value:null===a||void 0===a?void 0:a.destination,onChange:r,label:"Destination",variant:"outlined",size:"small"}),Object(n.jsx)(g.a,{fullWidth:!0,required:!0,style:i,className:"flex-item",name:"name",value:null===a||void 0===a?void 0:a.name,onChange:r,label:"Name",variant:"outlined",size:"small"}),Object(n.jsx)(g.a,{fullWidth:!0,style:i,className:"flex-item",name:"email",value:null===a||void 0===a?void 0:a.email,onChange:r,type:"email",label:"Email",variant:"outlined",size:"small"}),Object(n.jsx)(g.a,{fullWidth:!0,style:i,className:"flex-item",required:!0,name:"phone",value:null===a||void 0===a?void 0:a.phone,onChange:r,label:"Phonenumber",variant:"outlined",size:"small"}),Object(n.jsx)(x.a,{style:i,className:"flex-item textarea-2",rowsMin:3,cols:27,name:"comment",value:null===a||void 0===a?void 0:a.comment,placeholder:"Additional information.",onChange:r}),Object(n.jsx)(L,{className:"flex-item",handleClick:c})]})}function z(e){var t=e.order,a=e.handleFormatting,r=e.handleChange,c=Object(N.a)(),i=Object(w.a)(c.breakpoints.down("sm")),s=Object(m.g)(),o=function(){s.push("/")};return Object(n.jsxs)(n.Fragment,{children:[Object(n.jsx)(v.a,{className:"button-one-third",variant:"outlined",onClick:function(){s.push("/edit")},children:"Edit"}),Object(n.jsx)(m.b,{exact:!0,path:"/edit",children:Object(n.jsxs)(C.a,{fullScreen:i,open:!0,onClose:o,"aria-labelledby":"responsive-dialog-title",disableScrollLock:!0,children:[Object(n.jsx)(S.a,{children:Object(n.jsx)(D,{order:t,handleChange:r,handleClick:function(){a(),o()}})}),Object(n.jsx)(k.a,{children:Object(n.jsx)(v.a,{style:{backgroundColor:"white"},variant:"text",onClick:o,children:"Close"})})]})})]})}var P=a(38),_=a.n(P),F="/api/token";function U(){return(U=Object(j.a)(d.a.mark((function e(){return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,_.a.post(F);case 2:return e.next=4,_.a.post("".concat(F,"/is-new"));case 4:case"end":return e.stop()}}),e)})))).apply(this,arguments)}var R={refreshTokens:function(){return U.apply(this,arguments)}},M=_.a.create();M.interceptors.response.use((function(e){return e}),function(){var e=Object(j.a)(d.a.mark((function e(t){var a;return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:if(a=t.config,"access token expired"!==t.response.data.error){e.next=5;break}return e.next=4,R.refreshTokens();case 4:return e.abrupt("return",M(a));case 5:return e.abrupt("return",Promise.reject(t));case 6:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}());var W=M,B="/api/email";function H(){return(H=Object(j.a)(d.a.mark((function e(t){var a;return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,W.post("".concat(B,"/send-confirmation"),t);case 2:return a=e.sent,e.abrupt("return",a.data);case 4:case"end":return e.stop()}}),e)})))).apply(this,arguments)}var K="/api/calendar";function X(e,t,a){return q.apply(this,arguments)}function q(){return(q=Object(j.a)(d.a.mark((function e(t,a,n){var r;return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,W.post(K,{entry:t,order:a,options:n});case 2:return r=e.sent,e.abrupt("return",r.data);case 4:case"end":return e.stop()}}),e)})))).apply(this,arguments)}var G="/api/sms";function V(e){return Y.apply(this,arguments)}function Y(){return(Y=Object(j.a)(d.a.mark((function e(t){var a;return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,W.post(G,t);case 2:return a=e.sent,e.abrupt("return",a.data);case 4:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function J(e,t,a){var n=1*t.split(":")[0],r=e.getDay(),c=(6===r||7===r||0===r)&&15,i=e.getDate(),s=!![new Date(e.getFullYear(),e.getMonth()+1,0).getDate(),1].includes(i)&&15;return c&&(s=!1),[{value:c,name:"VIIKONLOPPULIS\xc4"},{value:s,name:"KUUNVAIHDELIS\xc4"},{value:n<8&&20,name:"AAMULIS\xc4"},{value:n>20&&20,name:"Y\xd6LIS\xc4"},{value:("Lasku"===a||"Lasku/Osamaksu"===a||"Invoice/Instalment payment"===a)&&14,name:"LASKULIS\xc4"}]}function $(e){return"Cannot find ".concat(e,". Invalid format.")}function Q(e){var t=new Date(e),a=t.getDate(),n=t.getMonth()+1,r=t.getFullYear();return a<10&&(a="0".concat(a)),n<10&&(n="0".concat(n)),"".concat(a,"-").concat(n,"-").concat(r)}function Z(e){var t=e.filter((function(e){return e.value}));return{array:t.map((function(e){return e.name})),string:t.map((function(e){return"\n".concat(e.name,"\n").concat(e.value,"\u20ac")})).reduce((function(e,t){return e+t}),"")}}function ee(e,t){return te.apply(this,arguments)}function te(){return(te=Object(j.a)(d.a.mark((function e(t,a){var n,r;return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return n=t.indexOf(a),r=t.slice(n),e.abrupt("return",r);case 3:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function ae(e){var t=/(?<=Date and time: \w+, )\w+ \d+(th|rd|st|nd)? \w+/.exec(e);if(!t)throw new Error($("date"));var a=new Date("".concat(t[0].replace(/th|rd|st|nd/,""),"Z")),n=/\d+:\d+/.exec(e)[0],r=new Date("\n    ".concat(a.getFullYear(),"\n    ").concat(a.getMonth()+1,"\n    ").concat(a.getDate(),"\n    ").concat(n)),c=r.toISOString().split("T")[0];return{confirmationFormat:Q(r),original:r,ISODate:c,time:n}}function ne(e){var t=/\d+(\.\d+)?(?=\sh.)/.exec(e);if(!t)throw new Error($("duration"));return t[0]}function re(e){var t="Payment Type: ",a=e.indexOf(t)+t.length,n=e.indexOf("PRICE"),r=e.slice(a,n).trim(),c=r.match(/\W+/g).filter((function(e){return"/"!==e&&" "!==e&&"\xe4"!==e})),i=r.indexOf(c[0].trim()),s=r.slice(0,i).trim();if(!s)throw new Error($("payment type"));return s}function ce(e){return J(ae(e).original,ae(e).time,re(e))}function ie(e){var t=/(?<=PRICE: )\d+/.exec(e);if(!t)throw new Error($("price"));var a=t,n=Object(l.a)(a,1);t=n[0],ce(e).filter((function(e){return e.value})).forEach((function(e){return t-=e.value}));var r=function(e){var t=e.indexOf("\u2014 Price: "),a=e.indexOf("\u2014 Booking time start"),n=e.slice(t,a);return n&&n.match(/\d+/)[0]}(e);t-=r;var c=ne(e),i=E.filter((function(e){return e.price===t/c}));if(0===i.length)throw new Error("Cannot recognize service. Invalid price or duration.");return i[0]}function se(e,t){var a="".concat(t,": "),n="Start location"===t?"End location":"Name",r=e.indexOf(a)+a.length,c=e.indexOf(n),i=e.slice(r,c).replaceAll(",","").trim(),s=i.slice(0,i.indexOf(" / ")),o=i.match(/\d{5}/);o=o&&o[0];var l=i.slice(i.indexOf(" / ")+" / ".length),u=s.match(/\D+/);u=u&&u[0].trim();var d=l.replace(o,"").trim();if(d=d||null,(!/\d+/.test(l)||l.includes(o)&&l.length<15)&&(d=s.replace(o,"").trim(),u=(u=l.match(/\D+/))&&u[0].trim()),d.includes(u)&&(d=d.replace(u,"").trim()),"Start location"===t&&!d)throw new Error($("address"));return{address:d,city:u,postalCode:o}}function oe(e){var t="Name: ",a=e.indexOf(t)+t.length,n=e.indexOf("Email"),r=e.slice(a,n).trim();if(!r)throw new Error($("name"));return r}function le(e){var t=/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.exec(e);if(!t)throw new Error($("email"));return t[0]}function ue(e){var t=/(?<=Phone: )[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*/.exec(e);if(!t)throw new Error($("phone"));return t[0].trim()}function de(e){var t=/(?<=Comment: )(.*\s*)*/.exec(e);t=t?t[0]:"";var a=/\n\n\-\-\nT\xe4m\xe4 viesti l\xe4hetettiin sivustolta Paku24\.fi \(https:\/\/paku24\.fi\)/;return a.exec(t)&&(t=t.replace(a,"")),t}var je=a(111),me=a.n(je);function pe(e){var t=e.inputRef;return Object(n.jsxs)(v.a,{className:"button-one-third flex-item",variant:"text",size:"small",onClick:function(){t.current.select(),document.execCommand("copy"),f.a.info("Copied!",500)},children:["Copy ",Object(n.jsx)(me.a,{})]})}var be=a(280),he=a(293),fe=a(292),xe=a(289),Oe=a(288),ve=a(291);function ge(e){var t=e.handleChange,a=e.options;return Object(n.jsxs)("div",{className:"checkbox-container",children:[Object(n.jsxs)(he.a,{className:"checkbox-distance flex-item",hiddenLabel:!1,size:"small",children:[Object(n.jsx)(be.a,{component:"legend",children:"Pick one:"}),Object(n.jsxs)(ve.a,{name:"gender1",value:a.distance,onChange:t,children:[Object(n.jsx)(fe.a,{name:"distance",value:"insideCapital",control:Object(n.jsx)(Oe.a,{color:"default"}),label:"\ud83c\udfd9 Inside capital"}),Object(n.jsx)(fe.a,{name:"distance",value:"outsideCapital",control:Object(n.jsx)(Oe.a,{color:"default"}),label:"\ud83c\udfde Outside capital"}),Object(n.jsx)(fe.a,{name:"distance",value:"fromCapitalToOutside",control:Object(n.jsx)(Oe.a,{color:"default"}),label:"\ud83c\udfd9->\ud83c\udfde From capital"}),Object(n.jsx)(fe.a,{name:"distance",value:"fromOutsideToCapital",control:Object(n.jsx)(Oe.a,{color:"default"}),label:"\ud83c\udfde->\ud83c\udfd9 To capital"})]})]}),Object(n.jsxs)(he.a,{className:"basic-flex",size:"small",children:[Object(n.jsx)(fe.a,{size:"small",className:"flex-item",control:Object(n.jsx)(xe.a,{checked:a.hsy,onChange:t,color:"primary"}),name:"hsy",label:"\u267b HSY",labelPlacement:"start"}),Object(n.jsx)(fe.a,{className:"flex-item",control:Object(n.jsx)(xe.a,{checked:a.secondCar,onChange:t,color:"primary"}),name:"secondCar",label:"Second car",labelPlacement:"start"}),Object(n.jsx)(fe.a,{className:"flex-item",control:Object(n.jsx)(xe.a,{checked:a.XL,onChange:t,color:"primary"}),name:"XL",label:"XL",labelPlacement:"start"})]})]})}var ye=a(112),Ce=a.n(ye);function ke(e){var t=e.handleClick,a=e.disabled,r=e.statusText;return Object(n.jsx)(v.a,{disabled:a,onClick:t,className:"button-phone flex-item",variant:"contained",size:"small",children:r?Object(n.jsx)("span",{style:{color:"grey"},children:r}):Object(n.jsxs)(n.Fragment,{children:[Object(n.jsx)("span",{children:"Send"}),Object(n.jsx)(Ce.a,{})]})})}var Se=a(113),we=a.n(Se);function Ne(e){var t=e.handleClick,a=e.disabled,r=e.statusText;return Object(n.jsx)(v.a,{disabled:a,className:"button-email flex-item",variant:"contained",size:"small",onClick:t,children:r?Object(n.jsx)("span",{style:{color:"grey"},children:r}):Object(n.jsxs)(n.Fragment,{children:[Object(n.jsx)("span",{children:"Send"}),Object(n.jsx)(we.a,{})]})})}var Te=a(114),Ee=a.n(Te);function Ae(e){var t=e.handleClick,a=e.disabled,r=e.statusText;return Object(n.jsx)(v.a,{disabled:a,className:"button-email flex-item",variant:"contained",size:"small",onClick:t,children:r?Object(n.jsx)("span",{style:{color:"grey"},children:r}):Object(n.jsxs)(n.Fragment,{children:[Object(n.jsx)("span",{children:"Add"}),Object(n.jsx)(Ee.a,{})]})})}var Ie=a(115),Le=a.n(Ie);function De(e){var t=e.handleClick;return Object(n.jsxs)(v.a,{className:"button-one-third flex-item",variant:"contained",size:"small",onClick:t,children:["New order ",Object(n.jsx)(Le.a,{})]})}var ze=a(56),Pe=a.n(ze),_e=a(116),Fe=a.n(_e);function Ue(e){var t=e.order,a=e.dispatchOrderActionsStatus_error,c=e.confirmation,i=e.custom,s=Object(r.useState)([]),o=Object(l.a)(s,2),u=o[0],d=o[1],j=Object(r.useState)(!1),m=Object(l.a)(j,2),p=m[0],b=m[1],h=Object(r.useState)(!1),f=Object(l.a)(h,2),x=f[0],O=f[1];Object(r.useEffect)((function(){if(p)a(!1);else{var e=[{id:1,type:"date",error:Pe.a.isBefore(t.date.ISODate,(new Date).toISOString()),message:"earlier than today. Value: ".concat(t.date.confirmationFormat||"No value")},{id:2,type:"address",error:Pe.a.isEmpty(t.address),message:"missing or is in incorrect format. Value: ".concat(t.address||"No value")},{id:3,type:"phone",error:!Pe.a.isMobilePhone(t.phone,["fi-FI","es-ES","sv-SE"]),message:"missing or is in incorrect format. Value: ".concat(t.phone||"No value")},{id:4,type:"email",error:!i&&!Pe.a.isEmail(t.email),message:"missing or is in incorrect format. Value: ".concat(t.email||"No value")}];d(e);var n=e.some((function(e){return e.error}));a(n),O(n)}}),[t.date,t.phone,t.address,t.email,p,i]);var v={color:"red"},g={color:"gray"},y=p?g:null;return Object(n.jsxs)(n.Fragment,{children:[c?Object(n.jsx)("div",{style:{borderTop:"1px solid gray",borderBottom:"1px solid gray",padding:"15px 0 15px 0",margin:"10px 0 10px 0"},className:"flex-100-space-between",children:Object(n.jsxs)("div",{style:y,children:[Object(n.jsx)(Fe.a,{}),u.map((function(e){return e.error?Object(n.jsxs)("div",{children:[Object(n.jsxs)("span",{style:p?g:v,children:[e.type," "]}),e.message]},e.id):null}))]})}):null,x&&c?Object(n.jsx)(fe.a,{style:{alignSelf:"flex-end"},control:Object(n.jsx)(xe.a,{checked:p,onChange:function(e){b(e.target.checked)},color:"default"}),label:"Ignore"}):null]})}function Re(e){var t=e.custom,a=Object(r.useState)(""),c=Object(l.a)(a,2),i=c[0],s=c[1],o=Object(r.useState)(""),u=Object(l.a)(o,2),p=u[0],O=u[1],v=Object(r.useState)(""),g=Object(l.a)(v,2),C=g[0],k=g[1],S=Object(r.useMemo)((function(){return{date:{original:new Date,ISODate:(new Date).toISOString().split("T")[0],confirmationFormat:Q(new Date)},time:"".concat((new Date).toTimeString().split(":")[0],":").concat((new Date).toTimeString().split(":")[1]),duration:1,serviceName:E[0].name,servicePrice:E[0].price,paymentType:"Maksukortti",fees:{array:[],string:""},address:"",destination:"",name:"",email:"",phone:"",comment:""}}),[]),w=Object(r.useState)(S),N=Object(l.a)(w,2),T=N[0],A=N[1],I={email:{status:null,disable:!1},sms:{status:null,disable:!1},calendar:{status:null,disable:!1},error:!1};function P(e){return e}var _=Object(r.useReducer)((function(e,t){switch(t.type){case"CHANGE_ACTIONS_STATUS_EMAIL":return Object(h.a)(Object(h.a)({},e),{},{email:t.payload});case"CHANGE_ACTIONS_STATUS_SMS":return Object(h.a)(Object(h.a)({},e),{},{sms:t.payload});case"CHANGE_ACTIONS_STATUS_CALENDAR":return Object(h.a)(Object(h.a)({},e),{},{calendar:t.payload});case"CHANGE_ACTIONS_STATUS_ERROR":return Object(h.a)(Object(h.a)({},e),{},{error:t.payload});case"CHANGE_ACTIONS_STATUS_RESET":return I;default:throw new Error}}),I,P),F=Object(l.a)(_,2),U=F[0],R=F[1];function M(e,t){R({type:"CHANGE_ACTIONS_STATUS_EMAIL",payload:{status:e,disable:t}})}function W(e,t){R({type:"CHANGE_ACTIONS_STATUS_CALENDAR",payload:{status:e,disable:t}})}function B(e,t){R({type:"CHANGE_ACTIONS_STATUS_SMS",payload:{status:e,disable:t}})}var K=Object(r.useMemo)((function(){return{distance:"insideCapital",hsy:!1,secondCar:!1,XL:!1}}),[]),q=Object(r.useState)(K),G=Object(l.a)(q,2),Y=G[0],$=G[1],te=Object(r.useRef)(null);function je(){s(""),A(S),$(K),k(""),R({type:"CHANGE_ACTIONS_STATUS_RESET"})}function me(){return(me=Object(j.a)(d.a.mark((function e(){var t,a,n;return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:if(e.prev=0,!(t=C)){e.next=9;break}return B("Waiting",!0),e.next=6,V({msg:t,phone:T.phone});case 6:a=e.sent,B("Done",!0),f.a.info("".concat(a.message),3e3);case 9:e.next=15;break;case 11:e.prev=11,e.t0=e.catch(0),B("Error",!1),f.a.fail(null===(n=e.t0.response)||void 0===n?void 0:n.data.error,2e3);case 15:case"end":return e.stop()}}),e,null,[[0,11]])})))).apply(this,arguments)}function be(){return(be=Object(j.a)(d.a.mark((function e(){var t,a,n;return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.prev=0,e.next=3,ee(C,T.address);case 3:if(!(t=e.sent)){e.next=11;break}return W("Waiting",!0),e.next=8,X(t,T,Y);case 8:a=e.sent,W("Done",!0),f.a.info("".concat(a.message,"\n").concat(a.createdEvent),3e3);case 11:e.next=17;break;case 13:e.prev=13,e.t0=e.catch(0),W("Error",!1),f.a.fail(null===(n=e.t0.response)||void 0===n?void 0:n.data.error,2e3);case 17:case"end":return e.stop()}}),e,null,[[0,13]])})))).apply(this,arguments)}function he(e){A(e),k(function(e){var t;try{t="VARAUKSEN TIEDOT\n".concat(e.date.confirmationFormat,"\nALKAMISAIKA\nKlo ").concat(e.time," (+/-15min)\nARVIOITU KESTO\n").concat(e.duration,"h (").concat(e.servicePrice,"\u20ac/h, ").concat(e.serviceName,")\nMAKSUTAPA\n").concat(e.paymentType).concat(e.fees.string,"\nL\xc4HT\xd6PAIKKA\n").concat(e.address,"\n").concat(e.destination.length>5?"M\xc4\xc4R\xc4NP\xc4\xc4\n".concat(e.destination,"\n"):"","NIMI\n").concat(e.name,"\n").concat(e.email?"S\xc4HK\xd6POSTI\n".concat(e.email,"\n"):"","PUHELIN\n").concat(e.phone,"\n").concat(e.comment?"LIS\xc4TIETOJA\n".concat(e.comment,"\n"):""),f.a.info("Succesefully formatted!",500)}catch(a){f.a.fail(a.message,1e3)}return t}(e))}function fe(){var e=Z(J(T.date.original,T.time,T.paymentType)),t=E.find((function(e){return e.name===T.serviceName})),a=Y.XL?t.priceXL:t.price;he(Object(h.a)(Object(h.a)({},T),{},{servicePrice:a,fees:e}))}function xe(e){var t=e.target.name;if("ISODate"===t){var a,n=e.target.value;return A(Object(h.a)(Object(h.a)({},T),{},{date:(a={},Object(b.a)(a,e.target.name,n),Object(b.a)(a,"original",new Date("".concat(n," ").concat(T.time))),Object(b.a)(a,"confirmationFormat",Q(n)),a)}))}if("time"===t)return A(Object(h.a)(Object(h.a)({},T),{},Object(b.a)({date:Object(h.a)(Object(h.a)({},T.date),{},{original:new Date("".concat(T.date.ISODate," ").concat(e.target.value))})},t,e.target.value)));if("serviceName"===t){var r=e.target.value,c=E.find((function(e){return e.name===r})).price;return A(Object(h.a)(Object(h.a)({},T),{},{serviceName:r,servicePrice:c}))}return A(Object(h.a)(Object(h.a)({},T),{},Object(b.a)({},t,e.target.value)))}return Object(r.useEffect)((function(){je()}),[t]),Object(r.useEffect)((function(){return $(Object(h.a)(Object(h.a)({},Y),{},{hsy:"Paku ja mies"===T.serviceName||"Paku ja kaksi miest\xe4"===T.serviceName}))}),[T.serviceName]),Object(n.jsxs)("div",{className:"flex-container",children:[Object(n.jsx)(m.b,{exact:!0,path:["/","/edit/:slug*"],children:Object(n.jsx)(x.a,{className:"textarea-1 flex-item",rowsMin:5,cols:40,value:t?p:i,placeholder:"Order info here.",onChange:t?function(e){O(e.target.value)}:function(e){s(e.target.value)}})}),Object(n.jsx)(m.b,{path:"/custom",children:Object(n.jsx)(D,{order:T,handleChange:xe,handleClick:fe})}),Object(n.jsx)(x.a,{className:"textarea-2 flex-item",rowsMin:5,cols:40,ref:te,value:C,placeholder:"Formatted confirmation will be outputted here.",onChange:function(e){return k(e.target.value)}}),Object(n.jsxs)("div",{className:"flex-100-space-between",children:[Object(n.jsxs)(m.b,{exact:!0,path:["/","/edit/:slug*"],children:[Object(n.jsx)(z,{handleChange:xe,handleFormatting:fe,order:T}),Object(n.jsx)(L,{handleClick:function(){try{var e=function(e){var t=e.split("\n"),a=[];return t.forEach((function(e){return a.push(e.trim())})),a.join("\n").replaceAll("\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014","").replaceAll("------------------------","")}(i),t=ie(e).name,a=E.find((function(e){return e.name===t})),n=Y.XL?a.priceXL:a.price,r=ae(e),c=se(e,"Start location"),s=se(e,"End location"),o="".concat(c.address,",").concat(c.postalCode?" "+c.postalCode:""," ").concat(c.city),l="".concat(s.address||"",",").concat(s.postalCode?" "+s.postalCode:""," ").concat(s.city||"");he({date:{original:r.original,ISODate:r.ISODate,confirmationFormat:r.confirmationFormat},time:ae(e).time,duration:ne(e),serviceName:t,servicePrice:n||ie(e).price,paymentType:re(e),fees:Z(ce(e)),address:o,destination:l,name:oe(e),email:le(e),phone:ue(e),comment:de(e)})}catch(u){f.a.fail(u.message,1e3)}}})]}),Object(n.jsx)(pe,{inputRef:te})]}),Object(n.jsx)(ge,{handleChange:function(e){$(Object(h.a)(Object(h.a)({},Y),{},Object(b.a)({},e.target.name,e.target.value||e.target.checked)))},options:Y}),Object(n.jsx)(Ue,{order:T,custom:t,confirmation:C,dispatchOrderActionsStatus_error:function(e){return R({type:"CHANGE_ACTIONS_STATUS_ERROR",payload:e})}}),Object(n.jsxs)("div",{className:"send-button-container",children:[Object(n.jsxs)("div",{className:"small-button-container",children:[Object(n.jsx)(y,{disabled:U.email.disable,custom:t,handleChange:xe,label:"Email",name:"email",value:T.email}),Object(n.jsx)(Ne,{statusText:U.email.status,disabled:U.error||U.email.disable||!(T.email&&C),handleClick:function(){return T.email&&C?(M("Waiting",!0),function(e){return H.apply(this,arguments)}({orderDetails:C,options:Y,email:T.email}).then((function(e){M("Done",!0),f.a.info(e,500)})).catch((function(e){M("Error",!1),f.a.fail(e.response.data.error)}))):f.a.fail("No confirmation found or recipients defined.",1e3)}})]}),Object(n.jsxs)("div",{className:"small-button-container",children:[Object(n.jsx)(y,{disabled:U.sms.disable,custom:t,handleChange:xe,label:"SMS",name:"phone",value:T.phone}),Object(n.jsx)(ke,{statusText:U.sms.status,disabled:U.error||U.sms.disable||!(T.phone&&C),handleClick:function(){return me.apply(this,arguments)}})]}),Object(n.jsx)("div",{className:"small-button-container",children:Object(n.jsx)(Ae,{handleClick:function(){return be.apply(this,arguments)},statusText:U.calendar.status,disabled:U.error||U.calendar.disable||!C})})]}),Object(n.jsx)(De,{handleClick:je})]})}a(237);var Me=a(285),We=a.p+"static/media/paku24-logo.7602fc02.png";function Be(e){var t,a=e.isLogged,c=e.custom,i=e.setCustom,s=e.handleChange,l=null===(t=Object(m.h)("/custom"))||void 0===t?void 0:t.url;return Object(r.useEffect)((function(){l&&i(!0)}),[l]),Object(n.jsxs)("div",{className:"logo",children:[Object(n.jsxs)("div",{children:[Object(n.jsx)(o.b,{onClick:function(){return i(!1)},to:a?"/":"/login",children:Object(n.jsx)("img",{src:We,alt:"Logo",width:"125px"})}),Object(n.jsx)("span",{className:"text",children:"CONFIRMATOR"})]}),Object(n.jsx)(m.b,{exact:!0,path:["/","/custom/:slug*"],children:a&&Object(n.jsx)(fe.a,{style:{margin:0,alignSelf:"center"},control:Object(n.jsx)(Me.a,{checked:c,onChange:s,color:"default"})})})]})}var He="/api/login";function Ke(){return(Ke=Object(j.a)(d.a.mark((function e(t){return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.abrupt("return",W.post(He,t).then((function(e){return e.data})));case 1:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function Xe(){return(Xe=Object(j.a)(d.a.mark((function e(){var t;return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,W.post("".concat(He,"/token"));case 2:return t=e.sent,e.abrupt("return",t.data);case 4:case"end":return e.stop()}}),e)})))).apply(this,arguments)}var qe={loginWithCredentials:function(e){return Ke.apply(this,arguments)},loginWithAccessToken:function(){return Xe.apply(this,arguments)}},Ge=a(117),Ve=a.n(Ge),Ye=function(e){var t=e.notification,a="black";return t.toLowerCase().includes("error")&&(a="red"),Object(n.jsx)(n.Fragment,{children:t?Object(n.jsxs)("div",{style:{backgroundColor:"white",color:a,padding:"10px",width:"80%",borderBottom:"3px solid darkgrey",fontSize:"small",display:"flex",alignItems:"center",marginBottom:"10px"},children:[Object(n.jsx)(Ve.a,{}),Object(n.jsx)("span",{style:{marginLeft:"10px"},children:t})]}):null})};function Je(e){var t,a=e.setUser,c={marginBottom:"7px",backgroundColor:"white"},i=Object(m.g)(),s=null===i||void 0===i||null===(t=i.location.state)||void 0===t?void 0:t.referrer,u=Object(r.useState)(""),p=Object(l.a)(u,2),b=p[0],h=p[1],f=Object(r.useState)(""),x=Object(l.a)(f,2),O=x[0],y=x[1],C=Object(r.useState)(!1),k=Object(l.a)(C,2),S=k[0],w=k[1],N=Object(r.useState)(!1),T=Object(l.a)(N,2),E=T[0],A=T[1],I=Object(r.useState)(""),L=Object(l.a)(I,2),D=L[0],z=L[1];function P(){return(P=Object(j.a)(d.a.mark((function e(t){var n,r,c;return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return t.preventDefault(),z("Working..."),e.prev=2,e.next=5,qe.loginWithCredentials({username:b,password:O});case 5:n=e.sent,r=n.user,z("Done"),i.push(s||"/"),a(r),e.next=18;break;case 12:e.prev=12,e.t0=e.catch(2),A(!0),w(!0),setTimeout((function(){return w(!1)}),2e3),z("Error: ".concat(null===(c=e.t0.response)||void 0===c?void 0:c.data.error));case 18:case"end":return e.stop()}}),e,null,[[2,12]])})))).apply(this,arguments)}return Object(n.jsx)("div",{style:{margin:"30px 5px"},children:Object(n.jsxs)("div",{style:{width:"95%",margin:"0 auto",padding:20,backgroundColor:"lightgrey",borderBottom:"4px solid darkgrey"},children:[Object(n.jsxs)("div",{style:{color:"black",fontSize:"1.3rem",letterSpacing:"0.7px",marginTop:"10px",marginBottom:"15px"},children:["LOGIN",Object(n.jsxs)("span",{style:{color:"black",fontSize:"1.0rem",letterSpacing:"0.2px"},children:[" ","or ",Object(n.jsx)(o.b,{to:"/register",children:"request access"})]})]}),Object(n.jsx)(Ye,{notification:D}),Object(n.jsxs)("form",{onSubmit:function(e){return P.apply(this,arguments)},style:{paddingBottom:"10px",height:"80%",display:"flex",flexFlow:"column wrap",justifyContent:"space-evenly"},children:[Object(n.jsx)(g.a,{className:"flex-item",style:c,error:E,required:!0,name:"username",value:b,onChange:function(e){var t=e.target;return h(t.value)},label:"Username",variant:"filled",size:"small"}),Object(n.jsx)(g.a,{className:"flex-item",style:c,error:E,type:"password",required:!0,value:O,name:"password",onChange:function(e){var t=e.target;return y(t.value)},label:"Password",variant:"filled",size:"small"}),Object(n.jsx)(v.a,{className:"flex-item",style:c,type:"submit",disabled:S,variant:"contained",size:"small",children:"Login"})]})]})})}function $e(){var e={marginBottom:"7px",backgroundColor:"white"},t=Object(r.useState)(""),a=Object(l.a)(t,2),c=a[0],i=a[1],s=Object(r.useState)(""),u=Object(l.a)(s,2),m=u[0],p=u[1],b=Object(r.useState)(""),h=Object(l.a)(b,2),f=h[0],x=h[1],O=Object(r.useState)(""),y=Object(l.a)(O,2),C=y[0],k=y[1],S=Object(r.useState)(!1),w=Object(l.a)(S,2),N=w[0],T=w[1];function E(e){return A.apply(this,arguments)}function A(){return(A=Object(j.a)(d.a.mark((function e(t){return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.abrupt("return",_.a.post("/api/registration/request-access",t).then((function(e){return e.data})));case 1:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function I(){return(I=Object(j.a)(d.a.mark((function e(t){var a,n;return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return t.preventDefault(),T(!0),k("Working..."),e.prev=3,e.next=6,E({name:c,email:m,purpose:f});case 6:a=e.sent,k(null===a||void 0===a?void 0:a.message),i(""),p(""),x(""),T(!1),e.next=18;break;case 14:e.prev=14,e.t0=e.catch(3),T(!1),k("Error: ".concat(null===e.t0||void 0===e.t0||null===(n=e.t0.response.data)||void 0===n?void 0:n.error));case 18:case"end":return e.stop()}}),e,null,[[3,14]])})))).apply(this,arguments)}return Object(n.jsx)("div",{style:{margin:"30px 5px"},children:Object(n.jsxs)("div",{style:{width:"95%",padding:20,margin:"0 auto",backgroundColor:"lightgrey",borderBottom:"4px solid darkgrey"},children:[Object(n.jsxs)("div",{style:{color:"black",fontSize:"1.3rem",letterSpacing:"0.7px",marginTop:"10px",marginBottom:"15px"},children:["REQUEST ACCESS",Object(n.jsxs)("span",{style:{color:"black",fontSize:"1.0rem",letterSpacing:"0.2px"},children:[" ","or ",Object(n.jsx)(o.b,{to:"/login",children:"login"})]})]}),Object(n.jsx)(Ye,{notification:C}),Object(n.jsxs)("form",{onSubmit:function(e){return I.apply(this,arguments)},style:{paddingBottom:"10px",height:"80%",display:"flex",flexFlow:"column wrap",justifyContent:"space-evenly"},children:[Object(n.jsx)(g.a,{style:e,required:!0,name:"name",value:c,onChange:function(e){var t=e.target;return i(t.value)},label:"Name",variant:"filled",size:"small"}),Object(n.jsx)(g.a,{style:e,type:"email",required:!0,value:m,name:"email",onChange:function(e){var t=e.target;return p(t.value)},label:"Email",variant:"filled",size:"small"}),Object(n.jsx)(g.a,{style:e,type:"text",required:!0,multiline:!0,rows:"3",value:f,name:"purpose",onChange:function(e){var t=e.target;return x(t.value)},label:"Why you want to use this application?",variant:"filled",size:"small"}),Object(n.jsx)(v.a,{style:e,type:"submit",disabled:N,variant:"contained",size:"small",children:"Send request"})]})]})})}a(238);var Qe="/api/logout";function Ze(){return(Ze=Object(j.a)(d.a.mark((function e(){return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.abrupt("return",_.a.post(Qe).then((function(e){return e.data})));case 1:case"end":return e.stop()}}),e)})))).apply(this,arguments)}var et={logout:function(){return Ze.apply(this,arguments)}},tt=a(118),at=a.n(tt);function nt(e){var t=e.handleClick;return Object(n.jsxs)(v.a,{style:{backgroundColor:"lightgrey"},variant:"outlined",size:"small",onClick:t,children:["Logout ",Object(n.jsx)(at.a,{})]})}function rt(e){var t=e.user,a=e.logoutUser;return Object(n.jsxs)("div",{style:{backgroundColor:"darkgrey",padding:"15px",marginTop:"40px",display:"flex",justifyContent:"space-between",borderTop:"3.5px solid lightgrey"},children:[Object(n.jsx)("div",{style:{paddingTop:"2px",marginRight:"20px"},children:Object(n.jsxs)("span",{style:{fontFamily:"monospace"},children:[" ",t.username,Object(n.jsx)("br",{}),t.name]})}),Object(n.jsx)(nt,{handleClick:function(){return et.logout().then(a)}})]})}function ct(e){var t=e.error;return Object(n.jsxs)("div",{role:"alert",children:[Object(n.jsx)("p",{children:"Something went wrong:"}),Object(n.jsx)("pre",{style:{color:"red"},children:t.message})]})}function it(e){var t=e.loading,a=e.redirectComponent,r=void 0===a?null:a,c=e.targetComponent;return Object(n.jsxs)(n.Fragment,{children:[t&&Object(n.jsx)("p",{children:"Loading..."}),r,!t&&!r&&c]})}function st(e){var t,a=e.user,c=e.setUser,i=e.children,s=Object(m.g)();null!==a&&"Loading"!==a||(t=s.location.pathname),Object(r.useEffect)(Object(j.a)(d.a.mark((function e(){var t,a;return d.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.prev=0,e.next=3,qe.loginWithAccessToken();case 3:return t=e.sent,a=t.user,e.abrupt("return",c(a));case 8:return e.prev=8,e.t0=e.catch(0),e.abrupt("return",c(null));case 11:case"end":return e.stop()}}),e,null,[[0,8]])}))),[]);var o="Loading"===a,l=null===a&&Object(n.jsx)(m.a,{to:{pathname:"/login",state:{referrer:t}}});return Object(n.jsxs)(n.Fragment,{children:[Object(n.jsx)(it,{loading:o,targetComponent:i,redirectComponent:l}),Object(n.jsx)(m.b,{path:"/login",children:null===a?Object(n.jsx)(Je,{setUser:c}):Object(n.jsx)(m.a,{to:"/"})})]})}var ot=function(){var e=Object(r.useState)("Loading"),t=Object(l.a)(e,2),a=t[0],c=t[1],i=Object(r.useState)(!1),s=Object(l.a)(i,2),o=s[0],u=s[1],d=Object(m.g)();return Object(n.jsx)("div",{className:"container",children:Object(n.jsxs)(p.ErrorBoundary,{FallbackComponent:ct,children:[Object(n.jsx)(Be,{isLogged:null!==a&&"Loading"!==a,custom:o,setCustom:u,handleChange:function(e){var t=e.target.checked;return u(t),t?d.push("/custom"):d.push("/")}}),Object(n.jsxs)(m.d,{children:[Object(n.jsx)(m.b,{path:"/register",children:Object(n.jsx)($e,{})}),Object(n.jsx)(m.b,{path:"/",children:Object(n.jsxs)(st,{user:a,setUser:c,children:[Object(n.jsx)(Re,{custom:o}),Object(n.jsx)(rt,{user:a,logoutUser:function(){return c(null)}})]})})]})]})})};s.a.render(Object(n.jsx)(c.a.StrictMode,{children:Object(n.jsx)(o.a,{basename:"/app",children:Object(n.jsx)(ot,{})})}),document.getElementById("root"))},35:function(e){e.exports=JSON.parse('[{"id":1,"name":"Paku ja kuski","price":30,"priceXL":40},{"id":2,"name":"Paku ja kuski kantoapuna","price":60,"priceXL":60},{"id":3,"name":"Paku ja kaksi muuttomiest\xe4","price":90,"priceXL":90},{"id":4,"name":"Paku ja mies","price":40,"priceXL":40},{"id":5,"name":"Paku ja kaksi miest\xe4","price":70,"priceXL":70}]')}},[[239,1,2]]]);
//# sourceMappingURL=main.e6300bd0.chunk.js.map