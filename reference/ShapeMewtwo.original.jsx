import { useState, useEffect } from "react";

const BG="#0d0118",CARD="#160d28",CARD2="#1e1035",PINK="#e040fb",PURP="#a855f7",GRN="#4ade80",CYAN="#22d3ee",AMB="#f59e0b",RED="#f87171",TEXT="#ede9f6",SUB="#7c6a9a",BORDER="#2a1a45";
const APP_NAME="Rotina & Metas";

const USERS={
  voce:{id:"voce",nome:"Rhebecca",kcalMeta:1600,waterMeta:3,cor:PINK,emoji:"🍑"},
  caua:{id:"caua",nome:"Cauã",kcalMeta:1800,waterMeta:4,cor:CYAN,emoji:"💪"},
};
const META_PTS=150;

const COMPRAS=[
  {item:"Peito de frango",qtd:"1 kg",preco:12,cat:"Proteína"},
  {item:"Ovos",qtd:"18 unidades",preco:12,cat:"Proteína"},
  {item:"Sardinha em lata",qtd:"3 latas",preco:9,cat:"Proteína"},
  {item:"Iogurte zero",qtd:"4 potes (200g cada)",preco:12,cat:"Proteína"},
  {item:"Pão francês",qtd:"500g (~10 unid.)",preco:5,cat:"Carboidrato"},
  {item:"Arroz",qtd:"1 kg",preco:4,cat:"Carboidrato"},
  {item:"Batata",qtd:"1 kg",preco:4,cat:"Carboidrato"},
  {item:"Farinha de aveia",qtd:"500g",preco:8,cat:"Carboidrato"},
  {item:"Alface",qtd:"1 pé",preco:3,cat:"Vegetal"},
  {item:"Tomate",qtd:"500g",preco:4,cat:"Vegetal"},
  {item:"Cenoura",qtd:"500g",preco:3,cat:"Vegetal"},
  {item:"Pepino",qtd:"2 unidades",preco:3,cat:"Vegetal"},
  {item:"Extrato de tomate",qtd:"1 lata pequena",preco:3,cat:"Tempero"},
  {item:"Molho de tomate s/ açúcar",qtd:"1 caixinha",preco:3,cat:"Tempero"},
];
const CAT_COR={Proteína:PINK,Carboidrato:AMB,Vegetal:GRN,Tempero:CYAN};

const RECEITAS=[
  {nome:"🍕 Pizza de Frigideira",tempo:"10 min",custo:"~R$4",ing:["2 pães franceses","Extrato de tomate + orégano + alho","50g queijo muçarela","Frango desfiado"],passos:["Corta o pão ao meio","Espalha molho com alho e orégano","Coloca frango e queijo","Tampa a frigideira em fogo baixo por 5 min","Queijo derreteu? Pronto!"],dica:"Usa o frango do meal prep!"},
  {nome:"🥟 Pastel de Forno",tempo:"25 min",custo:"~R$5 (6 unid.)",ing:["2 xíc. farinha de trigo","1 col. margarina","Sal + água morna","Recheio: frango+queijo"],passos:["Mistura farinha + sal + margarina + água","Descansa 10 min","Abre fina, corta em retângulos","Coloca recheio, fecha com garfo","Forno 200°C por 15-20 min"],dica:"Faz em lote! Guarda na geladeira."},
  {nome:"🫔 Esfirra de Massa de Frango",tempo:"30 min",custo:"~R$6 (8 unid.)",ing:["300g peito de frango cru","Sal, alho, ervas","Queijo para rechear"],passos:["Processa o frango cru até virar pasta","Tempera com sal, alho e ervas","Abre porções finas em papel manteiga","Recheio com queijo, fecha","Forno 200°C por ~20 min"],dica:"A MASSA é o frango! Alta proteína."},
  {nome:"🥞 Panqueca Doce de Banana",tempo:"10 min",custo:"~R$2",ing:["1 banana amassada","1 ovo","2 col. aveia","Canela"],passos:["Amassa a banana","Mistura ovo + aveia + canela","Frite em frigideira sem óleo","Come com iogurte zero"],dica:"Doce natural da banana — sem açúcar!"},
  {nome:"🍳 Bolinho de Caneca",tempo:"5 min",custo:"~R$2",ing:["1 ovo","2 col. aveia","1 banana OU 1 col. cacau","Canela + sal"],passos:["Mistura tudo numa caneca","Microondas por 2-3 minutos","Come direto na caneca!"],dica:"Doce urgente. Funciona!"},
  {nome:"🍝 Macarrão Cremoso",tempo:"20 min",custo:"~R$5",ing:["200g macarrão","150g frango desfiado","3 col. requeijão zero","Alho, azeite, pouco leite"],passos:["Cozinha macarrão al dente","Refoga alho, adiciona frango","Coloca requeijão + leite, mexe","Mistura com o macarrão"],dica:"Requeijão zero deixa cremoso sem pesar!"},
];

const MEDIDAS_INIT={ombros:"102",cintura:"80",quadril:"93",bunda:"100",braco:"32",coxa:"54",panturrilha:"38"};
const METAS_MED={ombros:"—",cintura:"70",quadril:"108",bunda:"112",braco:"28",coxa:"60",panturrilha:"—"};
const MEDIDAS_LABEL=[{key:"ombros",label:"Ombros"},{key:"cintura",label:"Cintura"},{key:"quadril",label:"Quadril"},{key:"bunda",label:"Bunda"},{key:"braco",label:"Braço"},{key:"coxa",label:"Coxa"},{key:"panturrilha",label:"Panturrilha"}];

const TREINO_VOCE=[
  {dia:"Segunda",tag:"Glúteos A",emoji:"🍑",isCardio:false,cardio:"40 min esteira em casa",info:"1×10 aquec + 3×8 pesado",exercicios:[
    {id:1,nome:"Hip Thrust",proto:"1×10 + 3×8",foco:"Glúteo Máximo ⭐⭐⭐",nota:"Vem primeiro. Sobe apertando no topo, segura 1 seg."},
    {id:2,nome:"Cadeira Abdutora",proto:"1×10 + 3×8",foco:"Glúteo Médio ⭐⭐⭐",nota:"Aquec reto → Série 1 reto → Séries 2 e 3 inclinada."},
    {id:3,nome:"Elevação Pélvica",proto:"1×10 + 3×8",foco:"Glúteo Máximo ⭐⭐",nota:"Pés no meio, pontas pra fora. Força no glúteo, não no calcanhar."},
    {id:4,nome:"Kickback na Polia",proto:"1×10 + 3×8 cada",foco:"Glúteo Máximo ⭐⭐",nota:"Perna de apoio flexionada, chuta pra fora."},
    {id:5,nome:"Abdução Lateral na Polia em Pé",proto:"1×10 + 3×8 cada",foco:"Glúteo Médio ⭐⭐⭐",nota:"Cabo no tornozelo, levanta perna pra fora mantendo reta."},
  ]},
  {dia:"Terça",tag:"Pernas",emoji:"🦵",isCardio:false,cardio:"40 min esteira em casa",info:"1×10 aquec + 3×8 pesado",exercicios:[
    {id:6,nome:"Leg Press 45°",proto:"1×10 + 3×8",foco:"Quadríceps + Glúteo",nota:"Pés além do quadril, pontas pra fora."},
    {id:7,nome:"Stiff com Halteres",proto:"1×10 + 3×8",foco:"Posterior + Glúteo Máximo",nota:"Empina o glúteo pra trás, halteres perto da perna."},
    {id:8,nome:"Cadeira Flexora",proto:"1×10 + 3×8",foco:"Posterior de Coxa",nota:"Rolo bem perto do tornozelo. Joelho fora do banco."},
    {id:9,nome:"Cadeira Extensora",proto:"1×10 + 3×8",foco:"Quadríceps",nota:"Joelho fora do banco. Controle e postura."},
    {id:10,nome:"Cadeira Adutora",proto:"1×10 + 3×8",foco:"Parte Interna da Coxa",nota:"Joelhos na lateral. Espremer as coxas — relaxa o glúteo."},
    {id:11,nome:"Panturrilha na Máquina",proto:"3×15",foco:"Panturrilha",nota:"Amplitude completa."},
  ]},
  {dia:"Quarta",tag:"Glúteos B",emoji:"🍑",isCardio:false,cardio:"40 min esteira em casa",info:"1×10 aquec + 3×8 pesado",exercicios:[
    {id:12,nome:"Agachamento Sumo no Smith",proto:"1×10 + 3×8",foco:"Glúteo Médio + Máximo ⭐⭐⭐",nota:"Pés largos, pontas a 45°. Desce até 90°."},
    {id:13,nome:"Cadeira Abdutora (volume)",proto:"1×10 + 3×8",foco:"Glúteo Médio ⭐⭐⭐",nota:"Mais volume. Glúteo médio é o que alarga o quadril!"},
    {id:14,nome:"Hip Thrust (pé mais largo)",proto:"1×10 + 3×8",foco:"Glúteo Médio + Máximo ⭐⭐",nota:"Pés um pouco mais abertos que o quadril."},
    {id:15,nome:"Kickback na Polia",proto:"1×10 + 3×8 cada",foco:"Glúteo Máximo ⭐⭐",nota:"Extensão cruzada também."},
    {id:16,nome:"Cadeira Adutora",proto:"1×10 + 3×8",foco:"Parte Interna da Coxa",nota:"Vai ficando mais fácil a cada semana!"},
  ]},
  {dia:"Quinta",tag:"Cardio",emoji:"🏃",isCardio:true,cardio:"1 hora esteira em casa",exercicios:[]},
  {dia:"Sexta",tag:"Superior",emoji:"💪",isCardio:false,cardio:"40 min esteira em casa",info:"3×12 — carga moderada, NÃO progredir",exercicios:[
    {id:17,nome:"Remada Articulada",proto:"3×12",foco:"Costas (definição)",nota:"Costas retas, puxa até o abdômen. Carga moderada."},
    {id:18,nome:"Remada Baixa Cabo",proto:"3×12",foco:"Costas (definição)",nota:"Peito estufado, escápula travada."},
    {id:19,nome:"Pulldown (pegada fechada)",proto:"3×12",foco:"Costas (sem alargar)",nota:"Pegada fechada! Puxa até a cintura."},
    {id:20,nome:"Tríceps na Máquina",proto:"3×12",foco:"Tríceps (2/3 do braço)",nota:"Cotovelos fixos. Braços finos vêm daqui!"},
    {id:21,nome:"Rosca com Halteres",proto:"3×12",foco:"Bíceps (definição)",nota:"Sobe contraindo, desce alongando ao máximo."},
    {id:22,nome:"Scott Máquina",proto:"3×12",foco:"Bíceps (definição)",nota:"Cotovelo fixo. Desce e sobe controlado."},
  ]},
  {dia:"Sábado",tag:"Glúteos + Pernas C",emoji:"🔥",isCardio:false,cardio:"40 min esteira em casa",info:"1×10 aquec + 3×8 pesado — sem panturrilha, foco total glúteo",exercicios:[
    {id:23,nome:"Hip Thrust",proto:"1×10 + 3×8",foco:"Glúteo Máximo ⭐⭐⭐",nota:"Mais pesado que segunda se conseguir!"},
    {id:24,nome:"Cadeira Abdutora",proto:"1×10 + 3×8",foco:"Glúteo Médio ⭐⭐⭐",nota:"Aquec reto → reto → 2x inclinada."},
    {id:25,nome:"Leg Press 45° (pé alto e largo)",proto:"1×10 + 3×8",foco:"Glúteo Máximo + Médio",nota:"Pés bem altos E mais abertos na plataforma."},
    {id:26,nome:"Elevação Pélvica",proto:"1×10 + 3×8",foco:"Glúteo Máximo ⭐⭐",nota:"Força no glúteo — não no calcanhar."},
    {id:27,nome:"Cadeira Adutora",proto:"1×10 + 3×8",foco:"Parte Interna da Coxa",nota:"Fecha o sábado equilibrando com a abdutora."},
  ]},
  {dia:"Domingo",tag:"Cardio",emoji:"🏃",isCardio:true,cardio:"1 hora esteira em casa",exercicios:[]},
];

const TREINO_CAUA=[
  {dia:"Segunda",tag:"Peito + Tríceps",emoji:"💪",isCardio:false,cardio:"40 min esteira",info:"1×aquec + 3×8 pesado",exercicios:[
    {id:1,nome:"Supino com Halteres",proto:"1×10 + 3×8",foco:"Peito (força)",nota:""},
    {id:2,nome:"Supino Máquina",proto:"1×10 + 3×8",foco:"Peito (isolamento)",nota:""},
    {id:3,nome:"Crossover na Polia",proto:"1×10 + 3×8",foco:"Peito (definição)",nota:"Verificar se usa polia alta ou baixa."},
    {id:4,nome:"Pec Deck",proto:"1×10 + 3×8",foco:"Peito (abertura)",nota:""},
    {id:5,nome:"Desenvolvimento Máquina",proto:"1×10 + 3×8",foco:"Ombro",nota:""},
    {id:6,nome:"Elevação Lateral",proto:"1×10 + 3×8",foco:"Ombro lateral",nota:""},
    {id:7,nome:"Tríceps Francês",proto:"1×10 + 3×8",foco:"Tríceps",nota:""},
    {id:8,nome:"Tríceps Testa",proto:"1×10 + 3×8",foco:"Tríceps",nota:""},
    {id:9,nome:"Tríceps na Polia",proto:"1×10 + 3×8",foco:"Tríceps",nota:""},
  ]},
  {dia:"Terça",tag:"Costas + Bíceps",emoji:"🏋️",isCardio:false,cardio:"40 min esteira",info:"1×aquec + 3×8 pesado",exercicios:[
    {id:10,nome:"Puxada Alta",proto:"1×10 + 3×8",foco:"Costas (largura)",nota:""},
    {id:11,nome:"Remada Baixa",proto:"1×10 + 3×8",foco:"Costas (espessura)",nota:""},
    {id:12,nome:"Remada Cavalinho",proto:"1×10 + 3×8",foco:"Costas (meio)",nota:""},
    {id:13,nome:"Voador Invertido (Pec Deck)",proto:"1×10 + 3×8",foco:"Ombro posterior",nota:"Pec deck no modo invertido para ombro posterior."},
    {id:14,nome:"Rosca Barra W",proto:"1×10 + 3×8",foco:"Bíceps",nota:""},
    {id:15,nome:"Rosca Scott",proto:"1×10 + 3×8",foco:"Bíceps (pico)",nota:""},
    {id:16,nome:"Rosca Inclinada 45°",proto:"1×10 + 3×8",foco:"Bíceps (alongamento)",nota:""},
  ]},
  {dia:"Quarta",tag:"Peito + Tríceps",emoji:"💪",isCardio:false,cardio:"40 min esteira",info:"1×aquec + 3×8 pesado",exercicios:[
    {id:17,nome:"Supino com Halteres",proto:"1×10 + 3×8",foco:"Peito (força)",nota:""},
    {id:18,nome:"Supino Máquina",proto:"1×10 + 3×8",foco:"Peito (isolamento)",nota:""},
    {id:19,nome:"Crossover na Polia",proto:"1×10 + 3×8",foco:"Peito (definição)",nota:"Verificar se usa polia alta ou baixa."},
    {id:20,nome:"Pec Deck",proto:"1×10 + 3×8",foco:"Peito (abertura)",nota:""},
    {id:21,nome:"Desenvolvimento Máquina",proto:"1×10 + 3×8",foco:"Ombro",nota:""},
    {id:22,nome:"Elevação Lateral",proto:"1×10 + 3×8",foco:"Ombro lateral",nota:""},
    {id:23,nome:"Tríceps Francês",proto:"1×10 + 3×8",foco:"Tríceps",nota:""},
    {id:24,nome:"Tríceps Testa",proto:"1×10 + 3×8",foco:"Tríceps",nota:""},
    {id:25,nome:"Tríceps na Polia",proto:"1×10 + 3×8",foco:"Tríceps",nota:""},
  ]},
  {dia:"Quinta",tag:"Cardio",emoji:"🏃",isCardio:true,cardio:"10 km corrida",exercicios:[]},
  {dia:"Sexta",tag:"Pernas",emoji:"🦵",isCardio:false,cardio:"40 min esteira",info:"1×aquec + 3×8 pesado",exercicios:[
    {id:26,nome:"Leg Press",proto:"1×10 + 3×8",foco:"Quadríceps + Glúteo",nota:""},
    {id:27,nome:"Agachamento no Smith",proto:"1×10 + 3×8",foco:"Quadríceps + Glúteo",nota:""},
    {id:28,nome:"Extensora",proto:"1×10 + 3×8",foco:"Quadríceps",nota:""},
    {id:29,nome:"Flexora",proto:"1×10 + 3×8",foco:"Posterior de Coxa",nota:""},
    {id:30,nome:"Panturrilha em Pé",proto:"1×10 + 3×8",foco:"Panturrilha",nota:""},
    {id:31,nome:"Panturrilha Sentada",proto:"1×10 + 3×8",foco:"Panturrilha (sóleo)",nota:""},
  ]},
  {dia:"Sábado",tag:"Peito + Tríceps",emoji:"💪",isCardio:false,cardio:"40 min esteira",info:"1×aquec + 3×8 pesado",exercicios:[
    {id:32,nome:"Supino com Halteres",proto:"1×10 + 3×8",foco:"Peito (força)",nota:""},
    {id:33,nome:"Supino Máquina",proto:"1×10 + 3×8",foco:"Peito (isolamento)",nota:""},
    {id:34,nome:"Crossover na Polia",proto:"1×10 + 3×8",foco:"Peito (definição)",nota:"Verificar se usa polia alta ou baixa."},
    {id:35,nome:"Pec Deck",proto:"1×10 + 3×8",foco:"Peito (abertura)",nota:""},
    {id:36,nome:"Desenvolvimento Máquina",proto:"1×10 + 3×8",foco:"Ombro",nota:""},
    {id:37,nome:"Elevação Lateral",proto:"1×10 + 3×8",foco:"Ombro lateral",nota:""},
    {id:38,nome:"Tríceps Francês",proto:"1×10 + 3×8",foco:"Tríceps",nota:""},
    {id:39,nome:"Tríceps Testa",proto:"1×10 + 3×8",foco:"Tríceps",nota:""},
    {id:40,nome:"Tríceps na Polia",proto:"1×10 + 3×8",foco:"Tríceps",nota:""},
  ]},
  {dia:"Domingo",tag:"Cardio",emoji:"🏃",isCardio:true,cardio:"10 km corrida",exercicios:[]},
];

function todayStr(){const d=new Date();return`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;}
function parseDate(s){const[d,m,y]=s.split("/").map(Number);return new Date(y,m-1,d);}
function formatDate(d){return`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;}
function getWeekStart(s){const d=parseDate(s);const day=d.getDay();d.setDate(d.getDate()+(day===0?-6:1-day));return formatDate(d);}

function calcPontos(uid,cals,waters,checks,roundStart){
  const user=USERS[uid];
  const start=roundStart?parseDate(roundStart):new Date(0);
  let pts=0,calDays=0,waterDays=0,checkDays=0,totalDias=0;
  const allDates=new Set([...cals.map(l=>l.date),...waters.map(l=>l.date),...checks.map(l=>l.date)]);
  allDates.forEach(date=>{
    if(parseDate(date)<start)return;
    totalDias++;
    const cal=cals.find(l=>l.date===date);
    const water=waters.find(l=>l.date===date);
    const check=checks.find(l=>l.date===date);
    if(cal&&cal.kcal<=user.kcalMeta){pts+=1;calDays++;}
    if(water&&water.liters>=user.waterMeta){pts+=1;waterDays++;}
    if(check){if(check.status==="completo"){pts+=3;checkDays++;}else if(check.status==="parcial"){pts+=1;checkDays++;}}
  });
  return{pts,calDays,waterDays,checkDays,totalDias};
}

const sInp={background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,padding:"8px 10px",color:TEXT,fontSize:12,width:"100%",boxSizing:"border-box"};
const sLbl={fontSize:10,color:SUB,fontWeight:700,display:"block",marginBottom:4,marginTop:10,textTransform:"uppercase",letterSpacing:0.5};
const sBtn=(cor,full)=>({background:`linear-gradient(135deg,${cor},${PURP})`,border:"none",borderRadius:8,padding:"8px 16px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",...(full?{width:"100%"}:{})});

export default function App(){
  const[userId,setUserId]=useState(null);
  const[tab,setTab]=useState("ranking");
  const[treino,setTreino]=useState(null);
  const[cals,setCals]=useState([]);
  const[waters,setWaters]=useState([]);
  const[checks,setChecks]=useState([]);
  const[outroCals,setOutroCals]=useState([]);
  const[outroWaters,setOutroWaters]=useState([]);
  const[outroChecks,setOutroChecks]=useState([]);
  const[roundStart,setRoundStart]=useState(null);
  const[historico,setHistorico]=useState([]);
  const[showPrize,setShowPrize]=useState(false);
  const[winner,setWinner]=useState(null);
  const[medidas,setMedidas]=useState(MEDIDAS_INIT);
  const[medidasEd,setMedidasEd]=useState(false);
  const[medidasTemp,setMedidasTemp]=useState(MEDIDAS_INIT);
  const[weightLogs,setWeightLogs]=useState([]);
  const[selEx,setSelEx]=useState("");
  const[logData,setLogData]=useState(todayStr());
  const[logKg,setLogKg]=useState("");
  const[logSets,setLogSets]=useState("3");
  const[logReps,setLogReps]=useState("8");
  // inputs
  const[calDate,setCalDate]=useState(todayStr());
  const[calVal,setCalVal]=useState("");
  const[waterDate,setWaterDate]=useState(todayStr());
  const[waterVal,setWaterVal]=useState("");
  const[checkDate,setCheckDate]=useState(todayStr());
  const[checkStatus,setCheckStatus]=useState("none");
  const[saved,setSaved]=useState({});
  // treino ui
  const[diaAberto,setDiaAberto]=useState(null);
  const[exAberto,setExAberto]=useState(null);
  const[editEx,setEditEx]=useState(null);
  const[editData,setEditData]=useState({});
  const[addDia,setAddDia]=useState(null);
  const[newEx,setNewEx]=useState({nome:"",proto:"3×12",foco:"",nota:""});
  const[addDiaForm,setAddDiaForm]=useState(false);
  const[newDia,setNewDia]=useState({dia:"",tag:"",emoji:"🏋️"});
  // outros ui
  const[semAberta,setSemAberta]=useState({});
  const[recAberta,setRecAberta]=useState(null);

  const outro=userId==="voce"?"caua":"voce";
  const user=userId?USERS[userId]:null;
  const outroUser=userId?USERS[outro]:null;

  const loadData=async(uid)=>{
    const out=uid==="voce"?"caua":"voce";
    const defT=uid==="voce"?TREINO_VOCE:TREINO_CAUA;
    try{const r=await window.storage.get(`${uid}_treino`);setTreino(r?JSON.parse(r.value):defT);}catch{setTreino(defT);}
    try{const r=await window.storage.get(`${uid}_cals`,true);setCals(r?JSON.parse(r.value):[]);}catch{setCals([]);}
    try{const r=await window.storage.get(`${uid}_water`,true);setWaters(r?JSON.parse(r.value):[]);}catch{setWaters([]);}
    try{const r=await window.storage.get(`${uid}_check`,true);setChecks(r?JSON.parse(r.value):[]);}catch{setChecks([]);}
    try{const r=await window.storage.get(`${out}_cals`,true);setOutroCals(r?JSON.parse(r.value):[]);}catch{setOutroCals([]);}
    try{const r=await window.storage.get(`${out}_water`,true);setOutroWaters(r?JSON.parse(r.value):[]);}catch{setOutroWaters([]);}
    try{const r=await window.storage.get(`${out}_check`,true);setOutroChecks(r?JSON.parse(r.value):[]);}catch{setOutroChecks([]);}
    try{const r=await window.storage.get("roundStart",true);if(r)setRoundStart(r.value);}catch{}
    try{const r=await window.storage.get("historico",true);if(r)setHistorico(JSON.parse(r.value));}catch{}
    try{const r=await window.storage.get(`${uid}_medidas`);if(r)setMedidas(JSON.parse(r.value));}catch{}
    try{const r=await window.storage.get(`${uid}_wlogs`);if(r)setWeightLogs(JSON.parse(r.value));}catch{setWeightLogs([]);}
  };

  const flash=(k)=>{setSaved(p=>({...p,[k]:true}));setTimeout(()=>setSaved(p=>({...p,[k]:false})),1500);};

  const saveCal=async()=>{
    if(!calVal)return;
    const n=cals.find(l=>l.date===calDate)?cals.map(l=>l.date===calDate?{...l,kcal:Number(calVal)}:l):[{date:calDate,kcal:Number(calVal)},...cals];
    setCals(n);flash("cal");setCalVal("");
    try{await window.storage.set(`${userId}_cals`,JSON.stringify(n),true);}catch{}
    const{pts}=calcPontos(userId,n,waters,checks,roundStart);
    if(pts>=META_PTS&&!showPrize){setWinner(userId);setShowPrize(true);}
  };
  const delCal=async(d)=>{const n=cals.filter(l=>l.date!==d);setCals(n);try{await window.storage.set(`${userId}_cals`,JSON.stringify(n),true);}catch{}};

  const saveWater=async()=>{
    if(!waterVal)return;
    const n=waters.find(l=>l.date===waterDate)?waters.map(l=>l.date===waterDate?{...l,liters:Number(waterVal)}:l):[{date:waterDate,liters:Number(waterVal)},...waters];
    setWaters(n);flash("water");setWaterVal("");
    try{await window.storage.set(`${userId}_water`,JSON.stringify(n),true);}catch{}
    const{pts}=calcPontos(userId,cals,n,checks,roundStart);
    if(pts>=META_PTS&&!showPrize){setWinner(userId);setShowPrize(true);}
  };
  const delWater=async(d)=>{const n=waters.filter(l=>l.date!==d);setWaters(n);try{await window.storage.set(`${userId}_water`,JSON.stringify(n),true);}catch{}};

  const saveCheck=async()=>{
    const n=checks.find(l=>l.date===checkDate)?checks.map(l=>l.date===checkDate?{...l,status:checkStatus}:l):[{date:checkDate,status:checkStatus},...checks];
    setChecks(n);flash("check");
    try{await window.storage.set(`${userId}_check`,JSON.stringify(n),true);}catch{}
    const{pts}=calcPontos(userId,cals,waters,n,roundStart);
    if(pts>=META_PTS&&!showPrize){setWinner(userId);setShowPrize(true);}
  };
  const delCheck=async(d)=>{const n=checks.filter(l=>l.date!==d);setChecks(n);try{await window.storage.set(`${userId}_check`,JSON.stringify(n),true);}catch{}};

  const novaRodada=async()=>{
    const today=todayStr();
    const nh=[{winner,date:today},...historico];
    setHistorico(nh);setRoundStart(today);setShowPrize(false);setWinner(null);
    try{await window.storage.set("roundStart",today,true);}catch{}
    try{await window.storage.set("historico",JSON.stringify(nh),true);}catch{}
  };

  const saveTreino=async(n)=>{setTreino(n);try{await window.storage.set(`${userId}_treino`,JSON.stringify(n));}catch{}};
  const startEdit=(di,ei)=>{setEditEx(`${di}-${ei}`);setEditData({...treino[di].exercicios[ei]});};
  const confirmEdit=async()=>{
    const[di,ei]=editEx.split("-").map(Number);
    const n=treino.map((d,i)=>i===di?{...d,exercicios:d.exercicios.map((e,j)=>j===ei?{...e,...editData}:e)}:d);
    await saveTreino(n);setEditEx(null);
  };
  const delEx=async(di,ei)=>{const n=treino.map((d,i)=>i===di?{...d,exercicios:d.exercicios.filter((_,j)=>j!==ei)}:d);await saveTreino(n);};
  const addEx=async(di)=>{
    if(!newEx.nome)return;
    const n=treino.map((d,i)=>i===di?{...d,exercicios:[...d.exercicios,{...newEx,id:Date.now()}]}:d);
    await saveTreino(n);setAddDia(null);setNewEx({nome:"",proto:"3×12",foco:"",nota:""});
  };
  const delDia=async(di)=>{const n=treino.filter((_,i)=>i!==di);await saveTreino(n);};
  const addDiaFn=async()=>{
    if(!newDia.dia)return;
    const n=[...treino,{dia:newDia.dia,tag:newDia.tag,emoji:newDia.emoji||"🏋️",isCardio:false,cardio:"40 min esteira",info:"",exercicios:[]}];
    await saveTreino(n);setAddDiaForm(false);setNewDia({dia:"",tag:"",emoji:"🏋️"});
  };

  const saveMedidas=async(n)=>{setMedidas(n);setMedidasEd(false);try{await window.storage.set(`${userId}_medidas`,JSON.stringify(n));}catch{}};
  const saveWeight=async()=>{
    if(!logKg||!selEx)return;
    const n=[{id:Date.now(),ex:selEx,data:logData,kg:logKg,sets:logSets,reps:logReps},...weightLogs];
    setWeightLogs(n);flash("peso");setLogKg("");
    try{await window.storage.set(`${userId}_wlogs`,JSON.stringify(n));}catch{}
  };
  const delWeight=async(id)=>{const n=weightLogs.filter(l=>l.id!==id);setWeightLogs(n);try{await window.storage.set(`${userId}_wlogs`,JSON.stringify(n));}catch{}};

  const myStats=userId?calcPontos(userId,cals,waters,checks,roundStart):{pts:0,calDays:0,waterDays:0,checkDays:0,totalDias:0};
  const outroStats=userId?calcPontos(outro,outroCals,outroWaters,outroChecks,roundStart):{pts:0,calDays:0,waterDays:0,checkDays:0,totalDias:0};
  const todayCheck=checks.find(l=>l.date===todayStr());
  const todayCal=cals.find(l=>l.date===todayStr());
  const todayWater=waters.find(l=>l.date===todayStr());
  const todayPts=user?(
    (todayCal&&todayCal.kcal<=user.kcalMeta?1:0)+
    (todayWater&&todayWater.liters>=user.waterMeta?1:0)+
    (todayCheck?.status==="completo"?3:todayCheck?.status==="parcial"?1:0)
  ):0;

  const allExNames=[...new Set((treino||[]).flatMap(d=>d.exercicios.map(e=>e.nome)))];
  const curWLogs=weightLogs.filter(l=>l.ex===selEx);
  const maxKg=curWLogs.length?Math.max(...curWLogs.map(l=>parseFloat(l.kg)||0)):0;

  function groupByWeek(logs){
    const byWeek={};
    logs.forEach(l=>{const ws=getWeekStart(l.date);if(!byWeek[ws])byWeek[ws]=[];byWeek[ws].push(l);});
    return Object.keys(byWeek).sort((a,b)=>parseDate(b)-parseDate(a)).map(wk=>({wk,dias:byWeek[wk]}));
  }
  const calWeeks=groupByWeek(cals);
  const waterWeeks=groupByWeek(waters);

  if(!userId){
    return(
      <div style={{background:BG,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif",padding:24}}>
        <div style={{fontSize:48,marginBottom:8}}>💪</div>
        <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:800,background:`linear-gradient(90deg,${PINK},${PURP})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",textAlign:"center"}}>{APP_NAME}</h1>
        <p style={{color:SUB,fontSize:12,marginBottom:32}}>Quem é você?</p>
        {Object.values(USERS).map(u=>(
          <div key={u.id} onClick={()=>{setUserId(u.id);loadData(u.id);setSelEx("");setTab("ranking");}} style={{background:CARD,border:`2px solid ${u.cor}40`,borderRadius:16,padding:"20px 32px",marginBottom:14,cursor:"pointer",textAlign:"center",width:"100%",maxWidth:280,boxSizing:"border-box"}}>
            <div style={{fontSize:36}}>{u.emoji}</div>
            <div style={{fontWeight:800,fontSize:18,color:u.cor,marginTop:6}}>{u.nome}</div>
            <div style={{fontSize:11,color:SUB,marginTop:4}}>{u.kcalMeta} kcal · {u.waterMeta}L água/dia</div>
          </div>
        ))}
      </div>
    );
  }

  const TABS=[["ranking","🏆 Ranking"],["hoje","📊 Hoje"],["treino","🏋️ Treino"],["hist","📅 Histórico"],["progresso","📏 Progresso"],["dieta","🥗 Dieta"],["receitas","🍳 Receitas"],["compras","🛒 Compras"]];

  return(
    <div style={{background:BG,minHeight:"100vh",color:TEXT,fontFamily:"'Inter',sans-serif",fontSize:13,paddingBottom:40}}>
      {showPrize&&(
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:CARD,borderRadius:20,padding:28,textAlign:"center",border:`2px solid ${USERS[winner].cor}`,maxWidth:320,width:"100%"}}>
            <div style={{fontSize:56}}>🏆</div>
            <div style={{fontWeight:800,fontSize:22,color:USERS[winner].cor,margin:"12px 0 4px"}}>{USERS[winner].nome} venceu!</div>
            <div style={{color:SUB,fontSize:12,marginBottom:20}}>Chegou em {META_PTS} pontos! O outro tem que pagar um prêmio. 😄</div>
            <div style={{background:`${USERS[winner].cor}20`,borderRadius:10,padding:12,marginBottom:20,fontSize:11,color:USERS[winner].cor}}>🎁 Decidam juntos qual é o prêmio e comecem nova rodada!</div>
            <button style={sBtn(USERS[winner].cor,true)} onClick={novaRodada}>✅ Prêmio combinado — Nova Rodada!</button>
          </div>
        </div>
      )}

      <div style={{background:"linear-gradient(135deg,#1a0533 0%,#0d0118 100%)",padding:"16px 16px 12px",borderBottom:`1px solid ${BORDER}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:800,fontSize:16,background:`linear-gradient(90deg,${PINK},${PURP})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{APP_NAME}</div>
            <div style={{fontSize:11,color:user.cor,marginTop:2}}>{user.emoji} {user.nome} · {todayPts}/5 pts hoje</div>
          </div>
          <button onClick={()=>setUserId(null)} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:8,color:SUB,fontSize:11,padding:"4px 10px",cursor:"pointer"}}>Trocar</button>
        </div>
      </div>

      <div style={{display:"flex",background:CARD,borderBottom:`1px solid ${BORDER}`,overflowX:"auto"}}>
        {TABS.map(([k,l])=>(
          <button key={k} style={{padding:"10px 12px",fontSize:11,fontWeight:tab===k?700:400,color:tab===k?PINK:SUB,borderBottom:`2px solid ${tab===k?PINK:"transparent"}`,cursor:"pointer",whiteSpace:"nowrap",background:"none",border:"none",borderBottomColor:tab===k?PINK:"transparent",borderBottomWidth:2,borderBottomStyle:"solid"}} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={{padding:"14px 14px"}}>

        {tab==="ranking"&&<>
          <div style={{fontSize:11,color:SUB,marginBottom:14,lineHeight:1.6}}>🎯 Meta: <span style={{color:PINK,fontWeight:700}}>{META_PTS} pts</span> para ganhar · kcal✅=1pt · água✅=1pt · treino completo=3pts · parcial=1pt</div>
          {[{uid:userId,stats:myStats,u:user},{uid:outro,stats:outroStats,u:outroUser}].map(({uid,stats,u})=>(
            <div key={uid} style={{background:CARD,borderRadius:12,border:`2px solid ${u.cor}40`,marginBottom:12,overflow:"hidden"}}>
              <div style={{background:`${u.cor}15`,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:28}}>{u.emoji}</span>
                  <div><div style={{fontWeight:800,fontSize:15,color:u.cor}}>{u.nome}</div><div style={{fontSize:11,color:SUB}}>Rodada atual</div></div>
                </div>
                <div style={{textAlign:"right"}}><div style={{fontWeight:800,fontSize:28,color:u.cor}}>{stats.pts}</div><div style={{fontSize:10,color:SUB}}>/ {META_PTS} pts</div></div>
              </div>
              <div style={{padding:"10px 14px"}}>
                <div style={{background:"#ffffff15",borderRadius:8,height:10,overflow:"hidden",marginBottom:8}}>
                  <div style={{width:`${Math.min((stats.pts/META_PTS)*100,100)}%`,height:"100%",background:`linear-gradient(90deg,${u.cor},${PURP})`,borderRadius:8}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[["🔥 Kcal",stats.calDays],["💧 Água",stats.waterDays],["🏋️ Treino",stats.checkDays]].map(([l,d])=>(
                    <div key={l} style={{background:CARD2,borderRadius:8,padding:"8px",textAlign:"center"}}>
                      <div style={{fontSize:11,color:SUB}}>{l}</div>
                      <div style={{fontWeight:800,fontSize:16,color:u.cor}}>{stats.totalDias>0?Math.round((d/stats.totalDias)*100):0}%</div>
                      <div style={{fontSize:9,color:SUB}}>{d}/{stats.totalDias} dias</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {historico.length>0&&(
            <div style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`}}>
              <div style={{padding:"10px 14px",fontWeight:700,fontSize:13,color:AMB}}>🏅 Histórico de Rodadas</div>
              {historico.map((h,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 14px",borderTop:`1px solid ${BORDER}`,fontSize:12}}>
                  <span>{USERS[h.winner].emoji} <span style={{color:USERS[h.winner].cor,fontWeight:700}}>{USERS[h.winner].nome}</span> venceu</span>
                  <span style={{color:SUB}}>{h.date}</span>
                </div>
              ))}
            </div>
          )}
        </>}

        {tab==="hoje"&&<>
          <div style={{background:`${user.cor}15`,border:`1px solid ${user.cor}40`,borderRadius:12,padding:14,marginBottom:14,textAlign:"center"}}>
            <div style={{fontSize:36,fontWeight:800,color:user.cor}}>{todayPts}<span style={{fontSize:16,color:SUB}}>/5 pts</span></div>
            <div style={{fontSize:11,color:SUB,marginTop:2}}>{todayStr()}</div>
            <div style={{display:"flex",justifyContent:"center",gap:14,marginTop:8,fontSize:12}}>
              <span>{todayCal&&todayCal.kcal<=user.kcalMeta?"✅":"⬜"} Kcal</span>
              <span>{todayWater&&todayWater.liters>=user.waterMeta?"✅":"⬜"} Água</span>
              <span>{todayCheck?.status==="completo"?"✅":todayCheck?.status==="parcial"?"🟡":"⬜"} Treino</span>
            </div>
          </div>
          {[[PINK,"🔥 Calorias",`Meta: ${user.kcalMeta} kcal`,"cal",calDate,setCalDate,calVal,setCalVal,saveCal,"kcal",cals,delCal,l=>l.kcal<=user.kcalMeta,l=>`${l.kcal} kcal`],
            [CYAN,"💧 Água",`Meta: ${user.waterMeta}L`,"water",waterDate,setWaterDate,waterVal,setWaterVal,saveWater,"litros (ex: 2.8)",waters,delWater,l=>l.liters>=user.waterMeta,l=>`${l.liters}L`]
          ].map(([cor,titulo,subtitulo,k,date,setDate,val,setVal,save,placeholder,logs,del,okFn,dispFn])=>(
            <div key={k} style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,marginBottom:10,overflow:"hidden"}}>
              <div style={{background:`${cor}15`,padding:"10px 14px",fontWeight:700}}>{titulo} · <span style={{color:SUB,fontWeight:400,fontSize:11}}>{subtitulo}</span></div>
              <div style={{padding:14}}>
                <label style={sLbl}>Data</label><input style={sInp} type="text" value={date} onChange={e=>setDate(e.target.value)} placeholder="DD/MM/AAAA"/>
                <label style={sLbl}>Quantidade</label><input style={sInp} type="number" step="0.1" value={val} onChange={e=>setVal(e.target.value)} placeholder={placeholder}/>
                <button style={{...sBtn(saved[k]?"#059669":cor,true),marginTop:10}} onClick={save}>{saved[k]?"✓ Salvo!":"Salvar"}</button>
              </div>
              {logs.slice(0,5).map(l=>(
                <div key={l.date} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",borderTop:`1px solid ${BORDER}`}}>
                  <div><span style={{fontWeight:700,color:okFn(l)?GRN:RED,fontSize:14}}>{dispFn(l)}</span><span style={{color:SUB,fontSize:11,marginLeft:8}}>{l.date}</span></div>
                  <button style={{background:"none",border:"none",color:SUB,cursor:"pointer"}} onClick={()=>del(l.date)}>🗑</button>
                </div>
              ))}
            </div>
          ))}
          <div style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,overflow:"hidden"}}>
            <div style={{background:`${GRN}15`,padding:"10px 14px",fontWeight:700}}>🏋️ Check de Treino · <span style={{color:SUB,fontWeight:400,fontSize:11}}>completo=3pts · parcial=1pt</span></div>
            <div style={{padding:14}}>
              <label style={sLbl}>Data</label><input style={sInp} type="text" value={checkDate} onChange={e=>setCheckDate(e.target.value)} placeholder="DD/MM/AAAA"/>
              <label style={sLbl}>Status</label>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                {[["completo","✅ Completo",GRN],["parcial","🟡 Parcial",AMB],["none","❌ Não fiz",RED]].map(([k,l,c])=>(
                  <button key={k} onClick={()=>setCheckStatus(k)} style={{flex:1,padding:"8px 4px",background:checkStatus===k?`${c}30`:"#ffffff08",border:`1px solid ${checkStatus===k?c:BORDER}`,borderRadius:8,color:checkStatus===k?c:SUB,fontSize:10,cursor:"pointer",fontWeight:checkStatus===k?700:400}}>{l}</button>
                ))}
              </div>
              <button style={{...sBtn(saved.check?"#059669":GRN,true),marginTop:10}} onClick={saveCheck}>{saved.check?"✓ Salvo!":"Salvar"}</button>
            </div>
            {checks.slice(0,5).map(l=>(
              <div key={l.date} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",borderTop:`1px solid ${BORDER}`}}>
                <div><span style={{fontSize:14}}>{l.status==="completo"?"✅":l.status==="parcial"?"🟡":"❌"}</span><span style={{color:SUB,fontSize:11,marginLeft:8}}>{l.date}</span></div>
                <button style={{background:"none",border:"none",color:SUB,cursor:"pointer"}} onClick={()=>delCheck(l.date)}>🗑</button>
              </div>
            ))}
          </div>
        </>}

        {tab==="treino"&&treino&&<>
          <div style={{color:SUB,fontSize:11,marginBottom:12}}>Toque para expandir · ✏️ editar · 🗑 excluir</div>
          {treino.map((d,di)=>(
            <div key={di} style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,marginBottom:10,overflow:"hidden"}}>
              <div style={{background:`${user.cor}15`,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setDiaAberto(diaAberto===di?null:di)}>
                <span style={{fontSize:22}}>{d.emoji||"🏋️"}</span>
                <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14}}>{d.dia}</div><div style={{fontSize:11,color:SUB}}>{d.tag}</div></div>
                <span style={{background:`${user.cor}25`,color:user.cor,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{d.isCardio?"CARDIO":`${d.exercicios.length} ex.`}</span>
                <button onClick={e=>{e.stopPropagation();delDia(di);}} style={{background:"none",border:"none",color:SUB,cursor:"pointer",fontSize:14,padding:"0 4px"}}>🗑</button>
                <span style={{color:SUB}}>{diaAberto===di?"▲":"▼"}</span>
              </div>
              {diaAberto===di&&<>
                {d.info&&<div style={{padding:"8px 14px",fontSize:11,color:PURP,background:`${PURP}10`,borderBottom:`1px solid ${BORDER}`}}>📋 {d.info}</div>}
                <div style={{padding:"8px 14px",fontSize:11,color:GRN,background:`${GRN}10`,borderBottom:`1px solid ${BORDER}`}}>🏃 {d.cardio}</div>
                {d.exercicios.map((ex,ei)=>(
                  <div key={ei} style={{borderBottom:`1px solid ${BORDER}`}}>
                    {editEx===`${di}-${ei}`?(
                      <div style={{padding:12}}>
                        {[["nome","Nome"],["proto","Protocolo"],["foco","Foco muscular"],["nota","Notas"]].map(([k,l])=>(
                          <div key={k}><label style={sLbl}>{l}</label><input style={sInp} value={editData[k]||""} onChange={e=>setEditData(p=>({...p,[k]:e.target.value}))}/></div>
                        ))}
                        <div style={{display:"flex",gap:8,marginTop:10}}>
                          <button style={{...sBtn(GRN),flex:1}} onClick={confirmEdit}>Salvar</button>
                          <button style={{...sBtn("#444"),flex:1}} onClick={()=>setEditEx(null)}>Cancelar</button>
                        </div>
                      </div>
                    ):(
                      <div style={{padding:"10px 14px",cursor:"pointer"}} onClick={()=>setExAberto(exAberto===`${di}-${ei}`?null:`${di}-${ei}`)}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:13}}>{ex.nome}</div>
                            {ex.foco&&<div style={{fontSize:9,color:PINK,background:`${PINK}18`,padding:"2px 6px",borderRadius:8,display:"inline-block",marginTop:2}}>{ex.foco}</div>}
                          </div>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <span style={{background:CARD2,color:PURP,fontSize:10,padding:"2px 7px",borderRadius:10}}>{ex.proto}</span>
                            <button onClick={e=>{e.stopPropagation();startEdit(di,ei);}} style={{background:"none",border:"none",color:SUB,cursor:"pointer",fontSize:14}}>✏️</button>
                            <button onClick={e=>{e.stopPropagation();delEx(di,ei);}} style={{background:"none",border:"none",color:SUB,cursor:"pointer",fontSize:14}}>🗑</button>
                          </div>
                        </div>
                        {exAberto===`${di}-${ei}`&&ex.nota&&<div style={{marginTop:6,fontSize:11,color:SUB,lineHeight:1.5,padding:"6px 10px",background:"#ffffff08",borderRadius:8,borderLeft:`2px solid ${PURP}`}}>{ex.nota}</div>}
                      </div>
                    )}
                  </div>
                ))}
                {addDia===di?(
                  <div style={{padding:12,borderTop:`1px solid ${BORDER}`}}>
                    {[["nome","Nome do exercício"],["proto","Protocolo (ex: 3×12)"],["foco","Foco muscular"],["nota","Notas (opcional)"]].map(([k,l])=>(
                      <div key={k}><label style={sLbl}>{l}</label><input style={sInp} value={newEx[k]||""} onChange={e=>setNewEx(p=>({...p,[k]:e.target.value}))} placeholder={l}/></div>
                    ))}
                    <div style={{display:"flex",gap:8,marginTop:10}}>
                      <button style={{...sBtn(user.cor),flex:1}} onClick={()=>addEx(di)}>+ Adicionar</button>
                      <button style={{...sBtn("#444"),flex:1}} onClick={()=>setAddDia(null)}>Cancelar</button>
                    </div>
                  </div>
                ):(
                  <button style={{width:"100%",padding:"10px",background:"#ffffff08",border:"none",color:user.cor,fontSize:12,cursor:"pointer",borderTop:`1px solid ${BORDER}`}} onClick={()=>setAddDia(di)}>+ Adicionar exercício</button>
                )}
              </>}
            </div>
          ))}
          {addDiaForm?(
            <div style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,padding:14}}>
              <div style={{fontWeight:700,marginBottom:10}}>Novo dia de treino</div>
              {[["dia","Dia da semana (ex: Segunda)"],["tag","Tipo (ex: Pernas)"],["emoji","Emoji (ex: 🦵)"]].map(([k,l])=>(
                <div key={k}><label style={sLbl}>{l}</label><input style={sInp} value={newDia[k]||""} onChange={e=>setNewDia(p=>({...p,[k]:e.target.value}))} placeholder={l}/></div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <button style={{...sBtn(user.cor),flex:1}} onClick={addDiaFn}>Criar</button>
                <button style={{...sBtn("#444"),flex:1}} onClick={()=>setAddDiaForm(false)}>Cancelar</button>
              </div>
            </div>
          ):(
            <button style={sBtn(user.cor,true)} onClick={()=>setAddDiaForm(true)}>+ Adicionar dia de treino</button>
          )}
        </>}

        {tab==="hist"&&<>
          <div style={{fontWeight:700,fontSize:14,color:PINK,marginBottom:10}}>🔥 Calorias por Semana</div>
          {calWeeks.length===0&&<div style={{color:SUB,fontSize:12,textAlign:"center",padding:"20px 0"}}>Nenhum registro ainda.</div>}
          {calWeeks.map(({wk,dias})=>{
            const total=dias.reduce((s,l)=>s+l.kcal,0);const ab=semAberta[`c${wk}`]!==false;
            return(
              <div key={wk} style={{background:CARD,borderRadius:10,border:`1px solid ${BORDER}`,marginBottom:8,overflow:"hidden"}}>
                <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>setSemAberta(p=>({...p,[`c${wk}`]:!ab}))}>
                  <div style={{fontWeight:700,fontSize:12}}>{wk}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{color:PINK,fontWeight:700}}>{total.toLocaleString()} kcal</span><span style={{color:SUB}}>{ab?"▲":"▼"}</span></div>
                </div>
                {ab&&dias.map(l=>(
                  <div key={l.date} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",borderTop:`1px solid ${BORDER}`}}>
                    <div><span style={{fontWeight:700,color:l.kcal<=user.kcalMeta?GRN:RED,fontSize:14}}>{l.kcal} kcal</span><span style={{color:SUB,fontSize:11,marginLeft:8}}>{l.date}</span></div>
                    <button style={{background:"none",border:"none",color:SUB,cursor:"pointer",fontSize:12}} onClick={()=>delCal(l.date)}>🗑</button>
                  </div>
                ))}
              </div>
            );
          })}
          <div style={{fontWeight:700,fontSize:14,color:CYAN,margin:"20px 0 10px"}}>💧 Água por Semana</div>
          {waterWeeks.length===0&&<div style={{color:SUB,fontSize:12,textAlign:"center",padding:"20px 0"}}>Nenhum registro ainda.</div>}
          {waterWeeks.map(({wk,dias})=>{
            const media=(dias.reduce((s,l)=>s+l.liters,0)/dias.length).toFixed(1);const ab=semAberta[`w${wk}`]!==false;
            return(
              <div key={wk} style={{background:CARD,borderRadius:10,border:`1px solid ${BORDER}`,marginBottom:8,overflow:"hidden"}}>
                <div style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>setSemAberta(p=>({...p,[`w${wk}`]:!ab}))}>
                  <div style={{fontWeight:700,fontSize:12}}>{wk}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{color:CYAN,fontWeight:700}}>Média {media}L</span><span style={{color:SUB}}>{ab?"▲":"▼"}</span></div>
                </div>
                {ab&&dias.map(l=>(
                  <div key={l.date} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",borderTop:`1px solid ${BORDER}`}}>
                    <div><span style={{fontWeight:700,color:l.liters>=user.waterMeta?GRN:RED,fontSize:14}}>{l.liters}L</span><span style={{color:SUB,fontSize:11,marginLeft:8}}>{l.date}</span></div>
                    <button style={{background:"none",border:"none",color:SUB,cursor:"pointer",fontSize:12}} onClick={()=>delWater(l.date)}>🗑</button>
                  </div>
                ))}
              </div>
            );
          })}
        </>}

        {tab==="progresso"&&<>
          <div style={{fontWeight:700,fontSize:14,color:PINK,marginBottom:10}}>📏 Medidas</div>
          <div style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,marginBottom:14,overflow:"hidden"}}>
            <div style={{padding:"0 14px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"8px 0",fontWeight:700,fontSize:10,color:SUB,textTransform:"uppercase",borderBottom:`1px solid ${BORDER}`}}><span>Região</span><span style={{textAlign:"center"}}>Atual</span><span style={{textAlign:"right"}}>Meta</span></div>
              {MEDIDAS_LABEL.map(({key,label})=>(
                <div key={key} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"8px 0",borderBottom:`1px solid ${BORDER}`,fontSize:12}}>
                  <span style={{color:SUB}}>{label}</span>
                  <span style={{textAlign:"center",fontWeight:700,color:PINK}}>{medidas[key]} cm</span>
                  <span style={{textAlign:"right",color:METAS_MED[key]==="—"?SUB:GRN,fontSize:11}}>{METAS_MED[key]==="—"?"—":`${METAS_MED[key]} cm`}</span>
                </div>
              ))}
            </div>
            <div style={{padding:"10px 14px",borderTop:`1px solid ${BORDER}`}}>
              {!medidasEd
                ?<button style={sBtn(PURP,true)} onClick={()=>{setMedidasTemp({...medidas});setMedidasEd(true);}}>Atualizar medidas</button>
                :<>
                  {MEDIDAS_LABEL.map(({key,label})=>(
                    <div key={key}><label style={sLbl}>{label} (cm)</label><input style={sInp} type="number" value={medidasTemp[key]} onChange={e=>setMedidasTemp(p=>({...p,[key]:e.target.value}))}/></div>
                  ))}
                  <div style={{display:"flex",gap:8,marginTop:12}}>
                    <button style={{...sBtn(PINK),flex:1}} onClick={()=>saveMedidas(medidasTemp)}>Salvar</button>
                    <button style={{...sBtn("#444"),flex:1}} onClick={()=>setMedidasEd(false)}>Cancelar</button>
                  </div>
                </>
              }
            </div>
          </div>
          <div style={{fontWeight:700,fontSize:14,color:PINK,marginBottom:10}}>🏋️ Registro de Pesos</div>
          <div style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,marginBottom:10,overflow:"hidden"}}>
            <div style={{padding:14}}>
              <label style={sLbl}>Exercício</label>
              <select value={selEx} onChange={e=>setSelEx(e.target.value)} style={sInp}>
                <option value="">Selecione...</option>
                {allExNames.map(ex=><option key={ex} value={ex}>{ex}</option>)}
              </select>
              <label style={sLbl}>Data</label><input style={sInp} type="text" value={logData} onChange={e=>setLogData(e.target.value)} placeholder="DD/MM/AAAA"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:10}}>
                <div><label style={sLbl}>Kg</label><input style={sInp} type="number" value={logKg} onChange={e=>setLogKg(e.target.value)} placeholder="40"/></div>
                <div><label style={sLbl}>Séries</label><input style={sInp} type="number" value={logSets} onChange={e=>setLogSets(e.target.value)}/></div>
                <div><label style={sLbl}>Reps</label><input style={sInp} type="number" value={logReps} onChange={e=>setLogReps(e.target.value)}/></div>
              </div>
              <button style={{...sBtn(saved.peso?"#059669":PINK,true),marginTop:12}} onClick={saveWeight}>{saved.peso?"✓ Salvo!":"Salvar"}</button>
            </div>
          </div>
          {selEx&&curWLogs.length>0&&(
            <div style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",fontWeight:700,fontSize:13}}>Histórico — {selEx} {maxKg>0&&<span style={{color:GRN,fontSize:11,marginLeft:8}}>🏆 PR: {maxKg}kg</span>}</div>
              {curWLogs.map(l=>(
                <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",borderTop:`1px solid ${BORDER}`}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontWeight:800,fontSize:16,color:PINK}}>{l.kg}kg</span>
                      {parseFloat(l.kg)===maxKg&&<span style={{fontSize:10,color:GRN,background:"#0f1a10",padding:"1px 6px",borderRadius:10}}>🏆 PR</span>}
                    </div>
                    <div style={{fontSize:10,color:SUB}}>{l.sets}×{l.reps} · {l.data}</div>
                  </div>
                  <button style={{background:"none",border:"none",color:SUB,cursor:"pointer",fontSize:16}} onClick={()=>delWeight(l.id)}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </>}

        {tab==="dieta"&&<>
          <div style={{background:`${PINK}12`,border:`1px solid ${PINK}40`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:13,color:PINK,marginBottom:6}}>📊 Metas Diárias</div>
            {[["🔥 Calorias",`${user.kcalMeta} kcal`],["💧 Água",`${user.waterMeta}L`],["💪 Proteína","120g/dia"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${PINK}20`}}><span style={{color:SUB,fontSize:11}}>{l}</span><span style={{fontWeight:700,color:PINK}}>{v}</span></div>
            ))}
          </div>
          {[{h:"☀️ Café da Manhã",i:"9:00",kcal:"~350 kcal",its:["Panqueca de whey (whey 30g + aveia 40g + 1 ovo + canela)","Ovo mexido (2-3 ovos) + pão francês + requeijão zero","Iogurte zero 200g + aveia 30g + fruta","Cuscuz 60g seco + 2 ovos"]},
            {h:"🍽️ Almoço",i:"12:30",kcal:"~500 kcal",its:["Frango desfiado 150g cru + arroz 50g cru (ou batata 150g) + salada","Frango empanado fit (aveia) + arroz ou batata + salada","Frango parmegiana fit + arroz ou batata + salada","Sardinha 1 lata + batata 150g + cenoura + salada"]},
            {h:"🥪 Lanche",i:"17:30",kcal:"~250 kcal",its:["Rap 10 fit (2un) + frango desfiado 80g + requeijão zero + tomate e alface","Shake: whey 1 scoop + 200ml leite ou água","Iogurte zero 200g + fruta"]},
            {h:"🌙 Jantar",i:"20:00",kcal:"~370 kcal",its:["Omelete: 3 ovos + frango desfiado 80g + tomate + requeijão zero","Frango desfiado 120g + salada completa","Sardinha + salada + batata 100g","Torta frigideira: 2 ovos + aveia + frango + requeijão"]},
            {h:"🌛 Ceia",i:"22:00",kcal:"~130 kcal",its:["Iogurte zero 200g","Whey 1 scoop com água"]},
          ].map((ref,ri)=>(
            <div key={ri} style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,marginBottom:10,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between"}} onClick={()=>setDiaAberto(diaAberto===`d${ri}`?null:`d${ri}`)}>
                <div><div style={{fontWeight:800}}>{ref.h}</div><div style={{fontSize:11,color:SUB}}>{ref.i} · {ref.kcal}</div></div>
                <span style={{color:SUB}}>{diaAberto===`d${ri}`?"▲":"▼"}</span>
              </div>
              {diaAberto===`d${ri}`&&<div style={{padding:"0 14px 14px"}}>
                {ref.its.map((it,ii)=>(
                  <div key={ii} style={{display:"flex",gap:8,padding:"6px 0",borderTop:`1px solid ${BORDER}`,fontSize:12}}><span style={{color:PURP,minWidth:12}}>▸</span>{it}</div>
                ))}
              </div>}
            </div>
          ))}
        </>}

        {tab==="receitas"&&<>
          <div style={{color:SUB,fontSize:12,marginBottom:12}}>Receitas simples e gostosas 🍳</div>
          {RECEITAS.map((r,ri)=>(
            <div key={ri} style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,marginBottom:10,overflow:"hidden"}}>
              <div style={{padding:"12px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between"}} onClick={()=>setRecAberta(recAberta===ri?null:ri)}>
                <div><div style={{fontWeight:800,fontSize:13}}>{r.nome}</div><div style={{fontSize:11,color:SUB,marginTop:2}}>⏱ {r.tempo} · {r.custo}</div></div>
                <span style={{color:SUB}}>{recAberta===ri?"▲":"▼"}</span>
              </div>
              {recAberta===ri&&(
                <div style={{padding:"0 14px 14px"}}>
                  <div style={{fontSize:11,color:PURP,fontWeight:700,marginBottom:4}}>INGREDIENTES</div>
                  {r.ing.map((i,ii)=><div key={ii} style={{display:"flex",gap:8,fontSize:11,padding:"3px 0"}}><span style={{color:PURP}}>▸</span>{i}</div>)}
                  <div style={{fontSize:11,color:PINK,fontWeight:700,marginTop:10,marginBottom:4}}>MODO DE FAZER</div>
                  {r.passos.map((p,pi)=><div key={pi} style={{display:"flex",gap:8,marginBottom:4,fontSize:11}}><span style={{color:PINK,fontWeight:700,minWidth:18}}>{pi+1}.</span>{p}</div>)}
                  <div style={{marginTop:8,padding:"6px 10px",background:`${GRN}12`,borderLeft:`2px solid ${GRN}`,borderRadius:"0 6px 6px 0",fontSize:11,color:"#86efac"}}>💡 {r.dica}</div>
                </div>
              )}
            </div>
          ))}
        </>}

        {tab==="compras"&&<>
          <div style={{background:`${GRN}12`,border:`1px solid ${GRN}40`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:13,color:GRN,marginBottom:4}}>🛒 Lista Semanal</div>
            <div style={{fontSize:11,color:"#86efac"}}>Compra uma vez por semana · Foco no mais barato!</div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
            {Object.entries(CAT_COR).map(([cat,cor])=>(
              <div key={cat} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:SUB}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:cor}}/>{cat}
              </div>
            ))}
          </div>
          <div style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`}}>
            <div style={{padding:"0 14px"}}>
              {COMPRAS.map((c,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${BORDER}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:CAT_COR[c.cat],flexShrink:0}}/>
                    <div><div style={{fontSize:13,fontWeight:500}}>{c.item}</div><div style={{fontSize:10,color:SUB}}>{c.qtd}</div></div>
                  </div>
                  <div style={{fontWeight:700,color:PINK,fontSize:14,flexShrink:0}}>~R${c.preco}</div>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",padding:"12px 0"}}>
                <span style={{fontWeight:800,fontSize:15}}>Total semanal</span>
                <span style={{fontWeight:800,fontSize:18,color:PINK}}>~R${COMPRAS.reduce((s,c)=>s+c.preco,0)}</span>
              </div>
            </div>
          </div>
          <div style={{marginTop:10,padding:"10px 14px",background:`${PURP}12`,border:`1px solid ${PURP}30`,borderRadius:10,fontSize:11,color:"#c4b5fd",lineHeight:1.7}}>
            💡 Sardinha e ovos são seus melhores amigos — barato, proteico e prático! Whey é gasto mensal separado.
          </div>
        </>}

      </div>
    </div>
  );
}
