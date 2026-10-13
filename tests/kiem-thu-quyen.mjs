import { ghiQuyen } from '../netlify/functions/_lib/quyen.js';
import { trongTranThietBi, vanTayThietBi } from '../netlify/functions/_lib/khachauth.js';

// --- stub Supabase: ghi lại mọi lệnh để kiểm ---
function stub(kb){
  const ghiNhan=[];
  const q=(bang)=>{
    const st={bang,filters:{}};
    const api={
      select(){return api;},
      ilike(c,v){st.filters[c]=v;return api;},
      eq(c,v){st.filters[c]=v;return api;},
      in(c,v){st.filters[c]=v;return api;},
      gte(){return api;},
      not(){return api;},
      maybeSingle(){return Promise.resolve({data:(kb[bang]||[])[0]??null});},
      insert(d){ghiNhan.push(['insert',bang,d]);return Promise.resolve({error:kb.__loi||null});},
      update(d){ghiNhan.push(['update',bang,d]);return {eq(){return Promise.resolve({error:null});}};},
      then(r){return Promise.resolve({data:kb[bang]||[]}).then(r);},
    };
    return api;
  };
  return {from:q, ghiNhan};
}

const T=[];
const ok=(ten,dk,chiTiet)=>T.push({ten,dat:!!dk,chiTiet});

// 1. Không có email
let r = await ghiQuyen(stub({}), {order_id:'FT1',package:'online',customer_email:''});
ok('khong co email -> tu choi', r.ok===false && r.ly_do==='khong_co_email', JSON.stringify(r));

// 2. Gói 'other' không tra được
r = await ghiQuyen(stub({}), {order_id:'FT2',package:'other',customer_email:'a@b.com'});
ok("goi 'other' -> khong doan bua", r.ok===false && r.ly_do==='goi_khong_tra_duoc', JSON.stringify(r));

// 3. Gói online, chưa có quyền -> insert, het_han null (mua đứt)
let s = stub({entitlements:[]});
r = await ghiQuyen(s, {order_id:'FT3',package:'online',customer_email:'A@B.com'});
ok('goi online -> mua dut, het_han null', r.ok===true && r.het_han===null, JSON.stringify(r));
ok('email duoc ha chu thuong', s.ghiNhan[0]?.[2]?.email==='a@b.com', JSON.stringify(s.ghiNhan[0]));

// 4. Gói năm -> hết hạn sau 12 tháng
s = stub({entitlements:[]});
r = await ghiQuyen(s, {order_id:'FT4',package:'nam',customer_email:'a@b.com'});
const thang = r.het_han ? Math.round((new Date(r.het_han)-Date.now())/86400000) : 0;
ok('goi nam -> het han ~365 ngay', thang>360 && thang<371, 'so ngay='+thang);

// 5. Gói năm mua lại khi còn hạn -> cộng dồn, không cắt
const conHan = new Date(Date.now()+200*86400000).toISOString();
s = stub({entitlements:[{id:'e1',het_han:conHan}]});
r = await ghiQuyen(s, {order_id:'FT5',package:'nam',customer_email:'a@b.com'});
const ngay2 = Math.round((new Date(r.het_han)-Date.now())/86400000);
ok('gia han goi nam -> cong don', r.gia_han===true && ngay2>550, 'so ngay='+ngay2);

// 6. Trần thiết bị: chưa mua gì
let t = await trongTranThietBi(stub({entitlements:[]}), 'a@b.com', 'vt1');
ok('chua mua -> tu choi', t.ok===false && t.error==='chua_mua_goi_nao', JSON.stringify(t));

// 7. Trần thiết bị: gói online (trần 2), đã có 2 máy khác -> chặn máy thứ 3
t = await trongTranThietBi(stub({
  entitlements:[{goi:'online',het_han:null}],
  goi_quyen:[{goi:'online',so_thiet_bi:2}],
  document_access_log:[{thiet_bi:'m1'},{thiet_bi:'m2'}],
}), 'a@b.com', 'm3');
ok('day tran -> chan may moi', t.ok===false && t.error==='vuot_tran_thiet_bi', JSON.stringify(t));

// 8. Máy đã dùng rồi thì luôn lọt, kể cả khi đã đầy trần
t = await trongTranThietBi(stub({
  entitlements:[{goi:'online',het_han:null}],
  goi_quyen:[{goi:'online',so_thiet_bi:2}],
  document_access_log:[{thiet_bi:'m1'},{thiet_bi:'m2'}],
}), 'a@b.com', 'm2');
ok('may cu -> van lot', t.ok===true, JSON.stringify(t));

// 9. Gói đã hết hạn -> coi như chưa mua
t = await trongTranThietBi(stub({
  entitlements:[{goi:'nam',het_han:new Date(Date.now()-86400000).toISOString()}],
}), 'a@b.com', 'm1');
ok('goi het han -> tu choi', t.ok===false && t.error==='chua_mua_goi_nao', JSON.stringify(t));

// 10. Vân tay: cùng đầu vào -> cùng kết quả; khác user-agent -> khác
const req=(tb,ua)=>({headers:{get:(k)=>k==='x-thiet-bi'?tb:(k==='user-agent'?ua:null)}});
const v1=vanTayThietBi(req('abc','Chrome')), v2=vanTayThietBi(req('abc','Chrome')), v3=vanTayThietBi(req('abc','Safari'));
ok('van tay on dinh', v1===v2 && v1.length===32, v1);
ok('doi trinh duyet -> doi van tay', v1!==v3, v3);
ok('khong co gi -> null', vanTayThietBi(req('',''))===null, '');

let rot=0;
for(const x of T){ console.log((x.dat?'DAT  ':'HONG ')+x.ten+(x.dat?'':'   << '+x.chiTiet)); if(!x.dat) rot++; }
console.log('\n'+(T.length-rot)+'/'+T.length+' dat');
process.exit(rot?1:0);
