// ─── CANVAS PARTICLE BG ───
(function(){
  const c=document.getElementById('bg-canvas');
  const ctx=c.getContext('2d');
  let W,H,pts=[];
  function resize(){W=c.width=innerWidth;H=c.height=innerHeight;init()}
  function init(){
    pts=[];
    const n=Math.floor(W*H/18000);
    for(let i=0;i<n;i++) pts.push({
      x:Math.random()*W,y:Math.random()*H,
      vx:(Math.random()-0.5)*0.25,vy:(Math.random()-0.5)*0.25,
      r:Math.random()*1.5+0.5,
      a:Math.random()
    });
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;
      if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(0,229,180,${p.a*0.25})`;ctx.fill();
    });
    // draw lines between close pts
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
      const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);
      if(d<120){
        ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(0,229,180,${(1-d/120)*0.07})`;ctx.lineWidth=1;ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize',resize);
  resize();draw();
})();

// ─── INDEXEDDB HELPER ───
const FinWiseDB = {
  dbName: 'FinWiseDB',
  dbVersion: 1,
  
  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (e) => {
        const db = request.result;
        if (!db.objectStoreNames.contains('loans')) {
          db.createObjectStore('loans', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('credit')) {
          db.createObjectStore('credit', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('emi')) {
          db.createObjectStore('emi', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  },
  
  async save(storeName, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.add({ ...data, timestamp: Date.now() });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  
  async getAll(storeName) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  
  async delete(storeName, id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  async clearStore(storeName) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },
  
  async clearAll() {
    await this.clearStore('loans');
    await this.clearStore('credit');
    await this.clearStore('emi');
    await this.clearStore('chats');
  },
  
  async exportData() {
    const loans = await this.getAll('loans');
    const credit = await this.getAll('credit');
    const emi = await this.getAll('emi');
    const chats = await this.getAll('chats');
    return { loans, credit, emi, chats };
  },
  
  async importData(data) {
    const db = await this.open();
    const stores = ['loans', 'credit', 'emi', 'chats'];
    for (const storeName of stores) {
      if (data[storeName] && Array.isArray(data[storeName])) {
        await this.clearStore(storeName);
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        for (const item of data[storeName]) {
          store.put(item);
        }
      }
    }
  }
};

// ─── TABS ───
function switchTab(name){
  ['loan','credit','emi','tips','db'].forEach(t=>{
    const panel = document.getElementById('panel-'+t);
    if(panel) panel.classList.toggle('active',t===name);
    const s=document.getElementById('tab-'+t);
    if(s) s.classList.toggle('active',t===name);
    const m=document.getElementById('mtab-'+t);
    if(m) m.classList.toggle('active',t===name);
  });
  if (name === 'db') {
    loadDBDashboard();
  }
}

// ─── LOCAL SIMULATED AI RESPONDERS ───
function generateMockResponse(type, inputs, query = '') {
  const fmt = n => '₹' + Number(Math.round(n)).toLocaleString('en-IN');
  if (type === 'loan') {
    const { name, age, emp, income, score, existEMI, amount, tenure, rateAnn, eligible, risk, foir, reqEMI, maxLoan, totalInt } = inputs;
    if (eligible) {
      return `Loan Application Assessment for ${name} (Age: ${age}):
APPROVED. The applicant exhibits a solid financial profile with a CIBIL score of ${score} and a manageable Debt-to-Income (FOIR) ratio of ${foir.toFixed(1)}%. The employment status (${emp}) indicates steady cash flows to support the monthly EMI of ${fmt(reqEMI)}. As a precaution, we advise maintaining a buffer of 3-6 months' EMIs in liquid savings. Overall, this is classified as a ${risk} risk profile, and we recommend proceeding with the disbursements under standard interest rate terms of ${rateAnn}% p.a.`;
    } else {
      let step1 = score < 650 ? `1. Rectify credit report discrepancies and pay off any outstanding dues to boost CIBIL score above 650 (current: ${score}).` : `1. Reduce non-essential monthly expenses to improve cash flow.`;
      let step2 = foir > 0.55 ? `2. Pay off existing short-term loans or credit cards to lower your current EMI outflow of ${fmt(existEMI)}, bringing your FOIR under the 40% threshold.` : `2. Consider adding a salaried co-applicant (spouse/parent) to enhance the combined eligible income base.`;
      let step3 = income < 20000 ? `3. Maintain a stable income history of at least 12-24 months and consider a lower loan amount (max eligible: ${fmt(maxLoan)}).` : `3. Opt for a longer tenure to reduce the monthly EMI requirement below ${fmt(income * 0.45)}.`;
      
      return `Loan Application Assessment for ${name} (Age: ${age}):
REJECTED. The application does not meet the bank's minimum criteria. The primary constraint is ${foir > 0.55 ? `excessive debt obligations relative to income (FOIR at ${foir.toFixed(1)}%)` : score < 650 ? `a low credit score of ${score} (minimum required: 650)` : `insufficient monthly disposable income`}.
To qualify for a loan of ${fmt(amount)} in the next 3-6 months, please take the following steps:
${step1}
${step2}
${step3}
Timeline: Re-apply in 3-6 months after stabilizing these financial metrics.`;
    }
  }
  
  if (type === 'credit') {
    const { score, loans, util, missed, age, enq, income, category } = inputs;
    let verdict = `Your CIBIL score of ${score} is classified as ${category}. ${score >= 750 ? 'You qualify for premium credit cards and lowest interest rates.' : score >= 700 ? 'You have a healthy profile but there is room for optimization.' : 'This score limits your loan options and increases borrowing costs.'}`;
    
    let dragging = 'Payment history and missed payments are currently the most stable factors.';
    if (missed > 0) {
      dragging = `Payment History: The ${missed} missed payment(s) in the last 12 months is severely impacting your credit score, carrying a 35% weight in the CIBIL algorithm.`;
    } else if (util > 50) {
      dragging = `Credit Utilisation: Your high credit utilisation of ${util}% is indicating high credit dependency, dragging down your score (keep it below 30%).`;
    } else if (enq > 3) {
      dragging = `Hard Enquiries: Having ${enq} inquiries in the last 6 months signals credit hunger and temporarily lowers your rating.`;
    } else if (age < 2) {
      dragging = `Credit History Age: A short credit history of ${age} years limits the CIBIL algorithm's ability to assess long-term credit reliability.`;
    }
    
    let step1 = missed > 0 ? `1. Set up auto-debits for all active accounts to ensure 100% on-time payments. (Impact: +40-60 points in 3-6 months)` : `1. Reduce overall credit card usage. Pay outstanding dues before the billing cycle date. (Impact: +20-30 points)`;
    let step2 = util > 30 ? `2. Request a credit limit increase or distribute spending across multiple cards to bring utilisation below 30% (currently ${util}%). (Impact: +15-25 points)` : `2. Avoid applying for new credit lines or cards to prevent hard enquiries. (Impact: +10-15 points)`;
    let step3 = loans === 0 ? `3. Open a small secured credit card (like FD-backed card) to establish active payment records.` : `3. Maintain older credit cards active to preserve your credit history length of ${age} years. (Impact: +10 points)`;
    
    let timeline = score >= 750 ? 'Already in the optimal zone. Keep up the disciplined habits!' : score >= 700 ? 'Expected timeline: 2-4 months of disciplined repayments to cross 750.' : 'Expected timeline: 6-9 months of consistent correction to reach 750+.';
    
    return `Verdict: ${verdict}
Most Impactful Drag: ${dragging}
Actionable Improvement Plan:
${step1}
${step2}
${step3}
Timeline: ${timeline}`;
  }
  
  if (type === 'emi') {
    const { principal, rate, tenure, emi, totalInterest, totalPayable } = inputs;
    const prepayMonthly = Math.round(emi * 0.1);
    const interestSaved = Math.round(totalInterest * 0.35);
    const tenureReduced = Math.round(tenure * 0.25);
    return `Loan Structure: A loan of ${fmt(principal)} at ${rate}% p.a. for ${tenure} months is standard. The interest ratio of ${((totalInterest/totalPayable)*100).toFixed(0)}% represents an interest outflow of ${fmt(totalInterest)}.

Prepayment Strategy: By prepaying an extra ${fmt(prepayMonthly)} monthly (equivalent to 10% of your EMI), you can reduce your tenure by ${tenureReduced} months (saving ~25% of the duration) and save approximately ${fmt(interestSaved)} in total interest.

Savings Blueprint:
1. Pay one extra EMI every year: Saves up to 2-3 years of tenure on home loans.
2. Direct 50% of annual bonuses or windfalls as lump-sum principal prepayments.
3. Keep the EMI constant if interest rates drop, rather than letting the tenure stretch.

Lesser-known Tip: In India, banks cannot charge prepayment penalties on floating-rate home loans. Make prepayments online through netbanking/UPI directly into the loan account. Ensure the bank adjusts it against the "Principal Outstanding" and not future EMIs.`;
  }
  
  if (type === 'chats') {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('build') || lowerQuery.includes('1 cr') || lowerQuery.includes('corpus')) {
      return `To build a ₹1 Crore corpus, you need to invest regularly in equity mutual funds via SIP (Systematic Investment Plan). Assuming a 12% annual return:
1. **15 Years Timeline**: Invest ₹20,000 per month.
2. **10 Years Timeline**: Invest ₹43,000 per month.
3. **20 Years Timeline**: Invest ₹10,000 per month.

*Blueprint:*
- Start an ELSS/Index fund SIP.
- Step up your SIP by 10% every year to reach your goal much faster.
- Avoid locking funds in low-yield FDs/insurance policies for long-term goals.`;
    }
    if (lowerQuery.includes('tax') || lowerQuery.includes('saving') || lowerQuery.includes('2025')) {
      return `Best Tax-Saving Investments under Section 80C for FY 2024-25 / 2025-26:
1. **ELSS (Equity Linked Savings Scheme)**: Lowest lock-in of 3 years, historical returns of 12-15%.
2. **PPF (Public Provident Fund)**: 15-year lock-in, currently 7.1% interest (completely tax-free).
3. **NPS (National Pension System)**: Additional ₹50,000 deduction under Sec 80CCD(1B), great for retirement.
4. **EPF / VPF**: Excellent debt allocation for salaried employees.

*Recommendation:* Use ELSS for wealth growth and PPF/NPS for stable, risk-free retirement savings.`;
    }
    if (lowerQuery.includes('prepay') || lowerQuery.includes('home loan') || lowerQuery.includes('pay off')) {
      return `Deciding whether to prepay a home loan depends on your current interest rate vs investment returns:
- **Prepay if**: Your home loan interest rate is high (e.g. >9.5% p.a.) or you prefer peace of mind.
- **Invest if**: You can consistently earn >12% p.a. through equity mutual funds, and your loan rate is lower (e.g. 8.5% p.a.) with tax benefits under Sec 24(b).

*Rule of Thumb:* Do a hybrid approach. Pay 1-2 extra EMIs annually and invest the rest in a diversified mutual fund.`;
    }
    if (lowerQuery.includes('sip') || lowerQuery.includes('lump sum') || lowerQuery.includes('investing')) {
      return `**SIP (Systematic Investment Plan) vs Lump Sum:**
- **SIP** is best for monthly salaries. It averages out the cost of buying mutual funds (Rupee Cost Averaging) and eliminates the need to time the market.
- **Lump Sum** is ideal when you receive a bonus or sell an asset. However, avoid investing a large lump sum at market peaks—use a **STP (Systematic Transfer Plan)** from a liquid fund to equity funds over 6-12 months.`;
    }
    if (lowerQuery.includes('cibil') || lowerQuery.includes('improve') || lowerQuery.includes('credit')) {
      return `To improve your CIBIL score quickly:
1. **100% On-Time Payments**: Never miss an EMI or credit card bill. Set auto-debit.
2. **Utilisation Below 30%**: If your credit limit is ₹1 Lakh, do not spend more than ₹30,000.
3. **Keep Old Accounts**: Age of credit history makes up 15% of your score. Keep your oldest card active.
4. **Avoid Hard Enquiries**: Do not apply for multiple loans/cards in a short window.`;
    }
    
    return `I received your question: "${query}".

*Connecting API Key:*
For general AI financial counseling on arbitrary topics, click the settings gear icon (⚙️) in the top bar to input your Anthropic API Key and Proxy URL.

*Quick Personal Finance Tips:*
- **Emergency Fund:** Keep 6 months of monthly expenses in a liquid savings account/sweeping FD.
- **Term Insurance:** Buy a pure term plan with 10-15x your annual income. Avoid investment-linked plans (ULIPs).
- **Health Insurance:** Secure a private health insurance cover of at least ₹5-10 Lakhs, independent of corporate plans.
- **Savings Rule:** Try to save and invest at least 20-30% of your take-home pay.`;
  }
}

function getMockFromMessage(userMsg) {
  if (userMsg.includes('Senior Indian bank credit officer')) {
    const nameMatch = userMsg.match(/Name:\s*([^,]+)/);
    const ageMatch = userMsg.match(/Age:\s*(\d+)/);
    const empMatch = userMsg.match(/Employment:\s*([^\n,]+)/);
    const incomeMatch = userMsg.match(/Monthly Income:\s*₹?([0-9,]+)/);
    const scoreMatch = userMsg.match(/Credit Score:\s*(\d+)/);
    const existEMIMatch = userMsg.match(/Existing EMI obligations:\s*₹?([0-9,]+)/);
    const amountMatch = userMsg.match(/Requested:\s*₹?([0-9,]+)/);
    const purposeMatch = userMsg.match(/Requested:\s*₹?[0-9,]+\s+([^\n]+)\s+for/);
    const tenureMatch = userMsg.match(/for\s*(\d+)\s*months/);
    const rateMatch = userMsg.match(/at\s*([0-9.]+)\s*%/);
    const foirMatch = userMsg.match(/FOIR:\s*([0-9.]+)\s*%/);
    const eligibleMatch = userMsg.match(/Decision:\s*(APPROVED|REJECTED)/);
    const riskMatch = userMsg.match(/Risk Level:\s*(\w+)/);
    const maxLoanMatch = userMsg.match(/Maximum eligible loan:\s*₹?([0-9,]+)/);
    
    const parseNum = (str) => str ? parseInt(str.replace(/,/g, ''), 10) : 0;
    
    const inputs = {
      name: nameMatch ? nameMatch[1].trim() : 'Applicant',
      age: ageMatch ? parseInt(ageMatch[1], 10) : 28,
      emp: empMatch ? empMatch[1].trim() : 'Salaried',
      income: parseNum(incomeMatch ? incomeMatch[1] : '0'),
      score: scoreMatch ? parseInt(scoreMatch[1], 10) : 750,
      existEMI: parseNum(existEMIMatch ? existEMIMatch[1] : '0'),
      amount: parseNum(amountMatch ? amountMatch[1] : '0'),
      tenure: tenureMatch ? parseInt(tenureMatch[1], 10) : 60,
      purpose: purposeMatch ? purposeMatch[1].trim() : 'Home Loan',
      rateAnn: rateMatch ? parseFloat(rateMatch[1]) : 10.5,
      foir: foirMatch ? parseFloat(foirMatch[1]) : 0,
      eligible: eligibleMatch ? eligibleMatch[1] === 'APPROVED' : true,
      risk: riskMatch ? riskMatch[1] : 'Low',
      reqEMI: 0,
      maxLoan: parseNum(maxLoanMatch ? maxLoanMatch[1] : '0'),
      totalInt: 0
    };
    
    const r = inputs.rateAnn / 12 / 100;
    inputs.reqEMI = inputs.amount * r * Math.pow(1+r, inputs.tenure) / (Math.pow(1+r, inputs.tenure) - 1);
    inputs.totalInt = (inputs.reqEMI * inputs.tenure) - inputs.amount;
    
    return generateMockResponse('loan', inputs);
  }
  
  if (userMsg.includes('CIBIL Credit Score Report:')) {
    const scoreMatch = userMsg.match(/Score:\s*(\d+)/);
    const missedMatch = userMsg.match(/Payment History:\s*(\d+)\s*missed/);
    const utilMatch = userMsg.match(/Credit Utilisation:\s*(\d+)%/);
    const ageMatch = userMsg.match(/Credit Age:\s*(\d+)\s*years/);
    const loansMatch = userMsg.match(/Active Accounts:\s*(\d+)/);
    const enqMatch = userMsg.match(/Hard Enquiries \(6 mo\):\s*(\d+)/);
    const incomeMatch = userMsg.match(/Monthly Income:\s*₹?([0-9,]+)/);
    
    const parseNum = (str) => str ? parseInt(str.replace(/,/g, ''), 10) : 0;
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 650;
    const cat = score >= 800 ? 'Excellent' : score >= 750 ? 'Very Good' : score >= 700 ? 'Good' : score >= 650 ? 'Fair' : score >= 580 ? 'Poor' : 'Very Poor';
    
    const inputs = {
      score,
      loans: loansMatch ? parseInt(loansMatch[1], 10) : 1,
      util: utilMatch ? parseInt(utilMatch[1], 10) : 30,
      missed: missedMatch ? parseInt(missedMatch[1], 10) : 0,
      age: ageMatch ? parseInt(ageMatch[1], 10) : 3,
      enq: enqMatch ? parseInt(enqMatch[1], 10) : 0,
      income: parseNum(incomeMatch ? incomeMatch[1] : '0'),
      category: cat
    };
    
    return generateMockResponse('credit', inputs);
  }
  
  if (userMsg.includes('Loan: ₹') || userMsg.includes('EMI: ₹')) {
    const principalMatch = userMsg.match(/Loan:\s*₹?([0-9,]+)/);
    const rateMatch = userMsg.match(/at\s*([0-9.]+)\s*%/);
    const tenureMatch = userMsg.match(/for\s*(\d+)\s*months/);
    const emiMatch = userMsg.match(/EMI:\s*₹?([0-9,]+)/);
    const interestMatch = userMsg.match(/Total interest:\s*₹?([0-9,]+)/);
    
    const parseNum = (str) => str ? parseInt(str.replace(/,/g, ''), 10) : 0;
    
    const inputs = {
      principal: parseNum(principalMatch ? principalMatch[1] : '0'),
      rate: rateMatch ? parseFloat(rateMatch[1]) : 10.5,
      tenure: tenureMatch ? parseInt(tenureMatch[1], 10) : 60,
      emi: parseNum(emiMatch ? emiMatch[1] : '0'),
      totalInterest: parseNum(interestMatch ? interestMatch[1] : '0'),
      totalPayable: parseNum(principalMatch ? principalMatch[1] : '0') + parseNum(interestMatch ? interestMatch[1] : '0')
    };
    
    return generateMockResponse('emi', inputs);
  }
  
  return generateMockResponse('chats', {}, userMsg);
}

// ─── ANTIGRAVITY AI ───
async function callAntigravity(userMsg,sys=''){
  const apiKey = localStorage.getItem('antigravity_api_key') || '';
  const apiProxy = localStorage.getItem('antigravity_api_proxy') || 'https://api.anthropic.com/v1/messages';
  
  if (!apiKey) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getMockFromMessage(userMsg));
      }, 700);
    });
  }

  const body={model:'claude-3-5-sonnet-20241022',max_tokens:1000,messages:[{role:'user',content:userMsg}]};
  if(sys) body.system=sys;
  
  try {
    const r=await fetch(apiProxy,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body:JSON.stringify(body)
    });
    const d=await r.json();
    if(d.error) throw new Error(d.error.message);
    return d.content.map(c=>c.text||'').join('');
  } catch(e) {
    console.warn('API connection failed, falling back to local simulation.', e);
    return getMockFromMessage(userMsg);
  }
}

const fmt=n=>'₹'+Number(Math.round(n)).toLocaleString('en-IN');

function setBtn(id,loading,label){
  const b=document.getElementById(id); if(!b)return;
  if(loading){b.disabled=true;b.innerHTML=`<span class="spin${b.classList.contains('btn-glow')?'':'-light'}"></span> Analysing…`}
  else{b.disabled=false;b.innerHTML=`<span>${label}</span>`}
}

// ─── LOAN ───
async function checkLoan(){
  const name=document.getElementById('ln-name').value.trim()||'Applicant';
  const age=+document.getElementById('ln-age').value||28;
  const emp=document.getElementById('ln-emp').value;
  const income=+document.getElementById('ln-income').value||0;
  const score=+document.getElementById('ln-score').value||0;
  const existEMI=+document.getElementById('ln-existemi').value||0;
  const amount=+document.getElementById('ln-amount').value||0;
  const tenure=+document.getElementById('ln-tenure').value||60;
  const purpose=document.getElementById('ln-purpose').value;
  const rateAnn=+document.getElementById('ln-rate').value||10.5;

  if(!income||!score||!amount){alert('Please fill in Income, Credit Score and Loan Amount.');return;}

  setBtn('loan-btn',true,'Check Eligibility');

  const r=rateAnn/12/100;
  const reqEMI=amount*r*Math.pow(1+r,tenure)/(Math.pow(1+r,tenure)-1);
  const foir=(reqEMI+existEMI)/income;
  const maxDisposable=(income*0.5)-existEMI;
  const maxLoan=Math.max(0,maxDisposable*(Math.pow(1+r,tenure)-1)/(r*Math.pow(1+r,tenure)));
  const totalPay=reqEMI*tenure;
  const totalInt=totalPay-amount;

  const eligible=score>=650&&income>=20000&&foir<=0.55&&age>=21&&age<=65&&maxDisposable>0;
  const risk=score>=750&&foir<0.35?'Low':score>=680&&foir<0.45?'Medium':'High';
  const riskCls=risk==='Low'?'badge-low':risk==='Medium'?'badge-medium':'badge-high';

  const prompt=`Senior Indian bank credit officer reviewing loan application:
Name: ${name}, Age: ${age}, Employment: ${emp}
Monthly Income: ₹${income.toLocaleString('en-IN')}, Credit Score: ${score}
Existing EMI obligations: ₹${existEMI.toLocaleString('en-IN')}/month
Requested: ₹${amount.toLocaleString('en-IN')} ${purpose} for ${tenure} months at ${rateAnn}% p.a.
Required EMI: ₹${Math.round(reqEMI).toLocaleString('en-IN')}/month
FOIR: ${(foir*100).toFixed(1)}% (max acceptable 55%)
Decision: ${eligible?'APPROVED':'REJECTED'} | Risk Level: ${risk}
Maximum eligible loan: ₹${Math.round(maxLoan).toLocaleString('en-IN')}

Write a 4-5 sentence assessment. If approved: highlight strong points and any precautions. If rejected: give 3 numbered concrete steps to become eligible within 3–6 months. Use ₹ for currency. Be direct and professional.`;

  let ai='';
  try{ai=await callAntigravity(prompt,'You are a senior HDFC/SBI credit officer giving concise, professional loan assessments to Indian applicants. No preamble. Start directly.')}
  catch(e){ai='AI analysis unavailable. Please verify your details.'}

  setBtn('loan-btn',false,'Check Eligibility');

  const pct=Math.min(foir/0.55*100,100);
  const pbarColor=foir<0.35?'var(--green)':foir<0.45?'var(--amber)':'var(--red)';
  const icon=eligible?'✅':'❌';
  const cardCls=eligible?'verdict-approved':'verdict-rejected';
  const icoCls=eligible?'v-green':'v-red';

  document.getElementById('loan-result').innerHTML=`<div class="rslide">
  <div class="verdict-card ${cardCls}">
    <div class="verdict-header">
      <div class="verdict-ico ${icoCls}">${icon}</div>
      <div>
        <div class="verdict-title">${eligible?'Loan Approved':'Application Rejected'}</div>
        <div class="verdict-sub">${name} · ${purpose} · ${tenure}-month tenure</div>
      </div>
      <span class="badge-risk ${riskCls}">● ${risk} Risk</span>
    </div>
    <div class="metrics">
      <div class="metric"><div class="metric-v">${fmt(eligible?amount:maxLoan)}</div><div class="metric-l">${eligible?'Approved Amount':'Max Eligible'}</div></div>
      <div class="metric"><div class="metric-v">${fmt(reqEMI)}</div><div class="metric-l">Monthly EMI</div></div>
      <div class="metric"><div class="metric-v">${(foir*100).toFixed(1)}%</div><div class="metric-l">FOIR</div></div>
      <div class="metric"><div class="metric-v">${score}</div><div class="metric-l">Credit Score</div></div>
      <div class="metric"><div class="metric-v">${fmt(totalInt)}</div><div class="metric-l">Total Interest</div></div>
      <div class="metric"><div class="metric-v">${rateAnn}%</div><div class="metric-l">Interest Rate</div></div>
    </div>
    <div class="pbar-wrap">
      <div class="pbar-head"><span>FOIR Utilisation</span><span style="color:${pbarColor}">${pct.toFixed(0)}% of 55% limit</span></div>
      <div class="pbar"><div class="pbar-fill" style="width:${pct}%;background:${pbarColor}"></div></div>
    </div>
    <div class="ai-block">
      <div class="ai-head">🤖 Antigravity AI Credit Assessment</div>
      <div class="ai-body">${ai}</div>
    </div>
  </div></div>`;

  // Auto-save to IndexedDB
  try {
    await FinWiseDB.save('loans', {
      name,
      age,
      emp,
      income,
      score,
      existEMI,
      amount,
      tenure,
      purpose,
      rateAnn,
      eligible,
      risk,
      foir: foir * 100,
      reqEMI,
      maxLoan,
      totalInt,
      aiAssessment: ai
    });
  } catch (e) {
    console.error('Failed to save loan check to DB', e);
  }
}

// ─── CREDIT ───
async function analyzeCredit(){
  const score=+document.getElementById('cs-score').value||0;
  if(!score){alert('Please enter your CIBIL score.');return;}
  const loans=+document.getElementById('cs-loans').value||0;
  const util=+document.getElementById('cs-util').value||0;
  const missed=+document.getElementById('cs-missed').value||0;
  const age=+document.getElementById('cs-age').value||0;
  const enq=+document.getElementById('cs-enq').value||0;
  const income=+document.getElementById('cs-income').value||0;

  setBtn('credit-btn',true,'Analyse My Score');

  const cat=score>=800?'Excellent':score>=750?'Very Good':score>=700?'Good':score>=650?'Fair':score>=580?'Poor':'Very Poor';
  const catHex=score>=800?'#22d385':score>=750?'#00e5b4':score>=700?'#8b7ff5':score>=650?'#f6a237':score>=580?'#f97316':'#ff5c5c';
  const pct=((score-300)/600*100).toFixed(1);

  // Factor scoring
  const factors=[
    {icon:'💳',name:'Payment History (35%)',desc:`${missed} missed payment${missed!==1?'s':''} in last 12 months`,
     score:missed===0?'Excellent':missed<=1?'Good':missed<=3?'Fair':'Poor',
     val:missed===0?97:missed<=1?80:missed<=3?55:30},
    {icon:'📊',name:'Credit Utilisation (30%)',desc:`Using ${util}% of available credit`,
     score:util<=20?'Excellent':util<=30?'Good':util<=50?'Fair':'Poor',
     val:util<=20?95:util<=30?78:util<=50?55:30},
    {icon:'📅',name:'Credit Age (15%)',desc:`${age} year${age!==1?'s':''} of credit history`,
     score:age>=7?'Excellent':age>=4?'Good':age>=2?'Fair':'Poor',
     val:age>=7?90:age>=4?72:age>=2?50:30},
    {icon:'🔗',name:'Credit Mix (10%)',desc:`${loans} active credit account${loans!==1?'s':''}`,
     score:loans>=2&&loans<=5?'Good':loans===1?'Fair':loans===0?'Poor':'Fair',
     val:loans>=2&&loans<=5?80:loans===1?60:35},
    {icon:'🔍',name:'New Enquiries (10%)',desc:`${enq} hard enquir${enq!==1?'ies':'y'} in last 6 months`,
     score:enq===0?'Excellent':enq<=1?'Good':enq<=3?'Fair':'Poor',
     val:enq===0?95:enq<=1?78:enq<=3?52:30},
  ];

  const bands=[
    {l:'Very Poor',r:'300–549',min:300,max:549,c:'#ff5c5c'},
    {l:'Poor',r:'550–649',min:550,max:649,c:'#f97316'},
    {l:'Fair',r:'650–699',min:650,max:699,c:'#f6a237'},
    {l:'Good',r:'700–749',min:700,max:749,c:'#00e5b4'},
    {l:'Excellent',r:'750–900',min:750,max:900,c:'#22d385'},
  ];
  const bandHTML=bands.map(b=>{
    const lit=score>=b.min&&score<=b.max;
    return `<div class="sband${lit?' lit':''}" style="background:${b.c}18;color:${b.c}">
      <div class="sband-lbl">${b.l}</div>
      <div class="sband-rng">${b.r}</div>
    </div>`;
  }).join('');

  const factorHTML=factors.map(f=>{
    const cls=f.score==='Excellent'||f.score==='Good'?'fs-good':f.score==='Fair'?'fs-ok':'fs-bad';
    return `<div class="factor-row">
      <div class="factor-icon">${f.icon}</div>
      <div class="factor-info">
        <div class="factor-name">${f.name}</div>
        <div class="factor-desc">${f.desc}</div>
      </div>
      <span class="factor-score ${cls}">${f.score}</span>
    </div>`;
  }).join('');

  // Donut SVG
  const principal=score>=750?score-750:0;
  const gap=score<750?750-score:0;
  const totalArc=Math.PI; // semicircle
  const scorePct=(score-300)/600;
  const dashArr=220;
  const dashOffset=dashArr*(1-scorePct);

  const prompt=`CIBIL Credit Score Report:
Score: ${score} — ${cat}
Payment History: ${missed} missed payments
Credit Utilisation: ${util}%
Credit Age: ${age} years
Active Accounts: ${loans}
Hard Enquiries (6 mo): ${enq}
${income?`Monthly Income: ₹${income.toLocaleString('en-IN')}`:''}

Provide:
1. One-sentence verdict on the score
2. The single most impactful factor dragging the score (be specific with the number)
3. Three numbered, actionable improvement steps with expected score impact (e.g. "+20–30 points")
4. Realistic timeline to reach 750+

Be specific, concise, India-focused. Under 200 words.`;

  let ai='';
  try{ai=await callAntigravity(prompt,'You are a CIBIL credit counselor. Give precise, numbered, actionable advice. No preamble.')}
  catch(e){ai='AI analysis unavailable.'}

  setBtn('credit-btn',false,'Analyse My Score');

  document.getElementById('credit-result').innerHTML=`<div class="rslide">
  <div class="verdict-card" style="background:linear-gradient(135deg,rgba(139,127,245,0.08),rgba(0,229,180,0.03));border:1px solid rgba(139,127,245,0.22)">
    <div class="verdict-header">
      <div class="verdict-ico v-blue">📊</div>
      <div>
        <div class="verdict-title" style="color:${catHex}">${score} — ${cat}</div>
        <div class="verdict-sub">CIBIL Score Analysis · Percentile: top ${Math.round((1-(score-300)/600)*100)}%</div>
      </div>
    </div>
    <div class="score-bands-row">${bandHTML}</div>
    <div class="pbar-wrap">
      <div class="pbar-head"><span>Score Position</span><span style="color:${catHex}">${score} / 900</span></div>
      <div class="pbar" style="height:8px">
        <div class="pbar-fill" style="width:${pct}%;background:linear-gradient(90deg,#ff5c5c 0%,#f6a237 35%,#00e5b4 65%,#22d385 100%)"></div>
      </div>
    </div>
    <div class="fcard" style="padding:20px;margin-bottom:0">
      <div class="fcard-title">⚖️ Score Factors</div>
      ${factorHTML}
    </div>
    <div class="ai-block">
      <div class="ai-head">🤖 Antigravity AI Credit Roadmap</div>
      <div class="ai-body">${ai}</div>
    </div>
  </div></div>`;

  // Auto-save to IndexedDB
  try {
    await FinWiseDB.save('credit', {
      score,
      loans,
      util,
      missed,
      age,
      enq,
      income,
      category: cat,
      aiRoadmap: ai
    });
  } catch (e) {
    console.error('Failed to save credit analysis to DB', e);
  }
}

// ─── EMI ───
function liveEMI(){
  const P=+document.getElementById('ep').value||0;
  const rA=+document.getElementById('er').value||0;
  const n=+document.getElementById('et').value||0;
  document.getElementById('er-range-val').textContent=rA+'%';
  document.getElementById('et-range-val').textContent=n+' mo';
  if(!P||!rA||!n){document.getElementById('emi-live').innerHTML='';return;}
  const r=rA/12/100;
  const emi=P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
  const tot=emi*n;
  const int=tot-P;
  const pPct=(P/tot*100).toFixed(1);
  const iPct=(int/tot*100).toFixed(1);

  // donut
  const circumference=251.2;
  const pDash=circumference*P/tot;
  const iDash=circumference*int/tot;

  document.getElementById('emi-live').innerHTML=`
  <div class="emi-hero">
    <div class="emi-box"><div class="emi-val">${fmt(emi)}</div><div class="emi-lbl">Monthly EMI</div></div>
    <div class="emi-box"><div class="emi-val">${fmt(tot)}</div><div class="emi-lbl">Total Payable</div></div>
    <div class="emi-box"><div class="emi-val" style="color:var(--red)">${fmt(int)}</div><div class="emi-lbl">Total Interest</div></div>
    <div class="emi-box"><div class="emi-val">${iPct}%</div><div class="emi-lbl">Interest Ratio</div></div>
  </div>
  <div class="donut-wrap">
    <svg width="140" height="140" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--teal)" stroke-width="12"
        stroke-dasharray="${pDash} ${circumference}" stroke-dashoffset="${circumference*0.25}" stroke-linecap="round" transform="rotate(-90 50 50)"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--red)" stroke-width="12"
        stroke-dasharray="${iDash} ${circumference}" stroke-dashoffset="${-(pDash-circumference*0.25)}" stroke-linecap="round" transform="rotate(-90 50 50)"/>
      <text x="50" y="48" text-anchor="middle" fill="var(--bright)" font-size="9" font-family="DM Mono" font-weight="500">${pPct}%</text>
      <text x="50" y="58" text-anchor="middle" fill="var(--muted)" font-size="6.5" font-family="DM Sans">principal</text>
    </svg>
    <div class="donut-legend">
      <div class="legend-item"><div class="legend-dot" style="background:var(--teal)"></div><div><div style="font-size:13px;color:var(--bright)">${fmt(P)}</div><div style="font-size:11px;color:var(--muted)">Principal (${pPct}%)</div></div></div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--red)"></div><div><div style="font-size:13px;color:var(--bright)">${fmt(int)}</div><div style="font-size:11px;color:var(--muted)">Interest (${iPct}%)</div></div></div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--violet)"></div><div><div style="font-size:13px;color:var(--bright)">${fmt(tot)}</div><div style="font-size:11px;color:var(--muted)">Total outflow</div></div></div>
    </div>
  </div>`;
}

async function getEMITips(){
  const P=+document.getElementById('ep').value||0;
  const rA=+document.getElementById('er').value||0;
  const n=+document.getElementById('et').value||0;
  if(!P||!rA||!n){alert('Fill all EMI fields first.');return;}
  setBtn('emi-ai-btn',true,'Get AI Prepayment Strategy');
  const r=rA/12/100;
  const emi=Math.round(P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1));
  const int=Math.round(emi*n-P);
  const prompt=`Loan: ₹${P.toLocaleString('en-IN')} at ${rA}% p.a. for ${n} months
EMI: ₹${emi.toLocaleString('en-IN')}/month | Total interest: ₹${int.toLocaleString('en-IN')}

Give:
1. Whether this is a good loan structure (1 sentence with reasoning)
2. Exact monthly prepayment amount to reduce tenure by 20% (with the new tenure)
3. Strategy to save maximum interest (e.g. lump sum vs monthly prepay)
4. One lesser-known tip specific to this loan size

Be specific with rupee amounts. Under 180 words.`;
  let ai='';
  try{ai=await callAntigravity(prompt,'You are a concise Indian loan advisor. No preamble. Use ₹ for amounts.')}
  catch(e){ai='AI tips unavailable.'}
  setBtn('emi-ai-btn',false,'Get AI Prepayment Strategy');
  document.getElementById('emi-ai-out').innerHTML=`<div class="fcard rslide">
    <div class="ai-block" style="margin-top:0">
      <div class="ai-head">🤖 Antigravity AI Prepayment Strategist</div>
      <div class="ai-body">${ai}</div>
    </div>
  </div>`;

  // Auto-save to IndexedDB
  try {
    await FinWiseDB.save('emi', {
      principal: P,
      rate: rA,
      tenure: n,
      emi,
      totalInterest: int,
      totalPayable: emi * n,
      aiStrategy: ai
    });
  } catch (e) {
    console.error('Failed to save EMI strategy to DB', e);
  }
}

// ─── TIPS CHAT ───
async function askTips(){
  const q=document.getElementById('tips-q').value.trim();
  if(!q) return;
  document.getElementById('tips-q').value='';
  const msgs=document.getElementById('tips-msgs');
  msgs.innerHTML+=`<div class="msg msg-user">${q}</div>`;
  msgs.innerHTML+=`<div class="msg msg-ai" id="ai-typing"><div class="msg-ai-head">🤖 FinWise AI</div><span class="spin-light" style="display:inline-block;width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.15);border-top-color:var(--teal);animation:rot 0.65s linear infinite"></span></div>`;
  msgs.scrollTop=msgs.scrollHeight;
  setBtn('tips-btn',true,'Send ↑');
  
  // Save user message to DB
  try {
    await FinWiseDB.save('chats', { sender: 'user', message: q });
  } catch(e) {}

  let ai='';
  try{ai=await callAntigravity(q,'You are FinWise AI, a friendly and knowledgeable personal finance advisor for India. You know Indian products (PPF, NPS, ELSS, SGB, FD, RD, NSC, Senior Citizen Savings Scheme, etc.), SEBI regulations, income tax rules, and RBI guidelines. Give practical, specific advice. Use bullet points and ₹ amounts where helpful. Be warm but concise.')}
  catch(e){ai='Sorry, I could not connect to the AI. Please try again.'}
  
  document.getElementById('ai-typing').outerHTML=`<div class="msg msg-ai"><div class="msg-ai-head">🤖 FinWise AI</div>${ai.replace(/\n/g,'<br>')}</div>`;
  msgs.scrollTop=msgs.scrollHeight;
  setBtn('tips-btn',false,'Send ↑');

  // Save AI message to DB
  try {
    await FinWiseDB.save('chats', { sender: 'ai', message: ai });
  } catch(e) {}
}

async function loadChatHistory() {
  try {
    const chats = await FinWiseDB.getAll('chats');
    const msgs = document.getElementById('tips-msgs');
    if (chats && chats.length > 0) {
      msgs.innerHTML = '';
      chats.forEach(c => {
        if (c.sender === 'user') {
          msgs.innerHTML += `<div class="msg msg-user">${c.message}</div>`;
        } else {
          msgs.innerHTML += `<div class="msg msg-ai"><div class="msg-ai-head">🤖 FinWise AI</div>${c.message.replace(/\n/g,'<br>')}</div>`;
        }
      });
      msgs.scrollTop = msgs.scrollHeight;
    }
  } catch (e) {
    console.error('Failed to load chat history', e);
  }
}

function askChip(el){
  document.getElementById('tips-q').value=el.textContent;
  askTips();
}

function clearForm(type){
  if(type==='loan'){
    ['ln-name','ln-age','ln-income','ln-score','ln-existemi','ln-amount','ln-rate'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    document.getElementById('ln-tenure').value=60;
    document.getElementById('ln-tenure-val').textContent='60 mo';
    document.getElementById('loan-result').innerHTML='';
  }
}

// ─── DATABASE AND DASHBOARD FUNCTIONS ───
async function loadDBDashboard() {
  try {
    const loans = await FinWiseDB.getAll('loans');
    const credit = await FinWiseDB.getAll('credit');
    const emi = await FinWiseDB.getAll('emi');
    
    // Set statistics
    document.getElementById('db-stat-loans').textContent = loans.length;
    document.getElementById('db-stat-credit').textContent = credit.length;
    document.getElementById('db-stat-emi').textContent = emi.length;
    
    const avgScore = credit.length > 0 ? Math.round(credit.reduce((acc, curr) => acc + curr.score, 0) / credit.length) : 'N/A';
    document.getElementById('db-stat-avgscore').textContent = avgScore;
    
    const totalAmt = loans.reduce((acc, curr) => acc + curr.amount, 0);
    document.getElementById('db-stat-totalamt').textContent = totalAmt > 0 ? fmt(totalAmt) : '₹0';
    
    drawCharts(credit, loans);
    renderHistoryTable(loans, credit, emi);
  } catch (e) {
    console.error('Failed to load DB dashboard', e);
  }
}

function drawCharts(creditRecords, loanRecords) {
  const chartCanvasWrap = document.getElementById('credit-trend-svg');
  if (!chartCanvasWrap) return;
  
  if (!creditRecords || creditRecords.length < 2) {
    chartCanvasWrap.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:12px;">
        Need at least 2 credit analysis records to display trend chart.
      </div>
    `;
    return;
  }
  
  const sorted = [...creditRecords].sort((a, b) => a.timestamp - b.timestamp);
  const scores = sorted.map(r => r.score);
  const minScore = Math.max(300, Math.min(...scores) - 20);
  const maxScore = Math.min(900, Math.max(...scores) + 20);
  const range = maxScore - minScore || 1;
  
  const width = 500;
  const height = 120;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const points = sorted.map((r, idx) => {
    const x = padding + (idx / (sorted.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((r.score - minScore) / range) * chartHeight;
    return { x, y, score: r.score, date: new Date(r.timestamp).toLocaleDateString('en-IN', {month:'short', day:'numeric'}) };
  });
  
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const dots = points.map(p => `
    <circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--teal)" stroke="var(--ink)" stroke-width="1.5"/>
    <text x="${p.x}" y="${p.y - 8}" text-anchor="middle" fill="var(--bright)" font-size="9" font-family="DM Mono" font-weight="500">${p.score}</text>
    <text x="${p.x}" y="${height - 2}" text-anchor="middle" fill="var(--muted)" font-size="8">${p.date}</text>
  `).join('');
  
  const yLabels = [minScore, Math.round((minScore + maxScore)/2), maxScore].map(val => {
    const y = padding + chartHeight - ((val - minScore) / range) * chartHeight;
    return `
      <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--border)" stroke-dasharray="3 3"/>
      <text x="2" y="${y + 3}" fill="var(--muted)" font-size="8" font-family="DM Mono">${val}</text>
    `;
  }).join('');
  
  chartCanvasWrap.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow:visible">
      ${yLabels}
      <polyline fill="none" stroke="url(#chartGrad)" stroke-width="2.5" points="${polylinePoints}" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--teal)"/>
          <stop offset="100%" stop-color="var(--violet)"/>
        </linearGradient>
      </defs>
    </svg>
  `;
}

function renderHistoryTable(loans, credit, emi) {
  const container = document.getElementById('db-history-rows');
  if (!container) return;
  
  const allRecords = [
    ...loans.map(r => ({ ...r, type: 'loan', label: 'Loan Check' })),
    ...credit.map(r => ({ ...r, type: 'credit', label: 'Credit Analysis' })),
    ...emi.map(r => ({ ...r, type: 'emi', label: 'EMI Calculation' }))
  ].sort((a, b) => b.timestamp - a.timestamp);
  
  if (allRecords.length === 0) {
    container.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px;font-size:12px;">No database records found. Run calculations to save data!</td></tr>`;
    return;
  }
  
  let html = '';
  allRecords.forEach(r => {
    const dateStr = new Date(r.timestamp).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let detailHTML = '';
    let loadBtnHTML = '';
    
    if (r.type === 'loan') {
      detailHTML = `<strong>${r.purpose}</strong> &middot; Requested: ${fmt(r.amount)} &middot; Result: <span style="color:${r.eligible?'var(--green)':'var(--red)'}">${r.eligible?'Approved':'Rejected'}</span> (${r.risk} Risk)`;
      loadBtnHTML = `<button class="db-btn-icon" onclick="loadRecordToForm('loan', ${r.id})" title="Load record into inputs">📂</button>`;
    } else if (r.type === 'credit') {
      detailHTML = `<strong>CIBIL ${r.score}</strong> (${r.category}) &middot; Util: ${r.util}% &middot; Missed: ${r.missed}`;
      loadBtnHTML = `<button class="db-btn-icon" onclick="loadRecordToForm('credit', ${r.id})" title="Load record into inputs">📂</button>`;
    } else if (r.type === 'emi') {
      detailHTML = `<strong>EMI ${fmt(r.emi)}</strong> &middot; Principal: ${fmt(r.principal)} &middot; Rate: ${r.rate}%`;
      loadBtnHTML = `<button class="db-btn-icon" onclick="loadRecordToForm('emi', ${r.id})" title="Load record into inputs">📂</button>`;
    }
    
    html += `
      <tr>
        <td style="color:var(--muted);font-family:'DM Mono',monospace;">${dateStr}</td>
        <td><span class="tag" style="background:${r.type==='loan'?'rgba(0,229,180,0.12)':r.type==='credit'?'rgba(139,127,245,0.12)':'rgba(246,162,55,0.12)'};color:${r.type==='loan'?'var(--teal)':r.type==='credit'?'var(--violet)':'var(--amber)'}">${r.label}</span></td>
        <td>${detailHTML}</td>
        <td>
          <div style="display:flex;gap:8px;">
            ${loadBtnHTML}
            <button class="db-btn-icon db-btn-danger" onclick="deleteDBRecord('${r.type}', ${r.id})" title="Delete record">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  });
  
  container.innerHTML = html;
}

async function loadRecordToForm(type, id) {
  try {
    if (type === 'loan') {
      const records = await FinWiseDB.getAll('loans');
      const r = records.find(x => x.id === id);
      if (!r) return;
      
      document.getElementById('ln-name').value = r.name || '';
      document.getElementById('ln-age').value = r.age || '';
      document.getElementById('ln-emp').value = r.emp || 'Salaried';
      document.getElementById('ln-income').value = r.income || '';
      document.getElementById('ln-score').value = r.score || '';
      document.getElementById('ln-existemi').value = r.existEMI || '';
      document.getElementById('ln-amount').value = r.amount || '';
      document.getElementById('ln-tenure').value = r.tenure || 60;
      document.getElementById('ln-tenure-val').textContent = (r.tenure || 60) + ' mo';
      document.getElementById('ln-purpose').value = r.purpose || 'Home Loan';
      document.getElementById('ln-rate').value = r.rateAnn || 10.5;
      
      switchTab('loan');
      checkLoan();
      
    } else if (type === 'credit') {
      const records = await FinWiseDB.getAll('credit');
      const r = records.find(x => x.id === id);
      if (!r) return;
      
      document.getElementById('cs-score').value = r.score || '';
      document.getElementById('cs-loans').value = r.loans || '';
      document.getElementById('cs-util').value = r.util || 30;
      document.getElementById('cs-util-val').textContent = (r.util || 30) + '%';
      document.getElementById('cs-missed').value = r.missed || 0;
      document.getElementById('cs-age').value = r.age || '';
      document.getElementById('cs-enq').value = r.enq || '';
      document.getElementById('cs-income').value = r.income || '';
      
      switchTab('credit');
      analyzeCredit();
      
    } else if (type === 'emi') {
      const records = await FinWiseDB.getAll('emi');
      const r = records.find(x => x.id === id);
      if (!r) return;
      
      document.getElementById('ep').value = r.principal || '';
      document.getElementById('er').value = r.rate || 10.5;
      document.getElementById('er-range').value = r.rate || 10.5;
      document.getElementById('er-range-val').textContent = (r.rate || 10.5) + '%';
      
      document.getElementById('et').value = r.tenure || 60;
      document.getElementById('et-range').value = r.tenure || 60;
      document.getElementById('et-range-val').textContent = (r.tenure || 60) + ' mo';
      
      switchTab('emi');
      liveEMI();
      
      if (r.aiStrategy) {
        document.getElementById('emi-ai-out').innerHTML = `<div class="fcard rslide">
          <div class="ai-block" style="margin-top:0">
            <div class="ai-head">🤖 Antigravity AI Prepayment Advisor (Restored)</div>
            <div class="ai-body">${r.aiStrategy}</div>
          </div>
        </div>`;
      }
    }
  } catch (e) {
    console.error('Failed to load record', e);
  }
}

async function deleteDBRecord(type, id) {
  if (!confirm('Are you sure you want to delete this record?')) return;
  try {
    const store = type === 'loan' ? 'loans' : type === 'credit' ? 'credit' : 'emi';
    await FinWiseDB.delete(store, id);
    loadDBDashboard();
  } catch (e) {
    alert('Failed to delete record: ' + e.message);
  }
}

async function clearFullDatabase() {
  if (!confirm('🚨 WARNING: This will permanently wipe all financial history, CIBIL logs, and advisor chats. Are you sure?')) return;
  try {
    await FinWiseDB.clearAll();
    loadDBDashboard();
    const msgs = document.getElementById('tips-msgs');
    if (msgs) {
      msgs.innerHTML = `<div class="msg msg-ai">
        <div class="msg-ai-head">🤖 FinWise AI</div>
        Hello! I'm your AI financial advisor powered by Antigravity. Ask me anything about personal finance in India — loans, investments, tax planning, insurance, or savings strategies. What's on your mind?
      </div>`;
    }
    alert('Database cleared successfully.');
  } catch (e) {
    alert('Failed to clear database.');
  }
}

async function exportDatabaseJSON() {
  try {
    const data = await FinWiseDB.exportData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href",     dataStr);
    downloadAnchor.setAttribute("download", `finwise_data_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (e) {
    alert('Failed to export database: ' + e.message);
  }
}

async function importDatabaseJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.loans && !data.credit && !data.emi && !data.chats) {
        throw new Error('Invalid backup file format.');
      }
      await FinWiseDB.importData(data);
      loadDBDashboard();
      loadChatHistory();
      alert('Database restored successfully from backup!');
    } catch (err) {
      alert('Failed to import backup: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ─── SETTINGS MODAL FUNCTIONS ───
function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    document.getElementById('setting-api-key').value = localStorage.getItem('antigravity_api_key') || '';
    document.getElementById('setting-api-proxy').value = localStorage.getItem('antigravity_api_proxy') || 'https://api.anthropic.com/v1/messages';
    modal.style.display = 'flex';
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (modal) modal.style.display = 'none';
}

function saveSettings() {
  const key = document.getElementById('setting-api-key').value.trim();
  const proxy = document.getElementById('setting-api-proxy').value.trim();
  
  localStorage.setItem('antigravity_api_key', key);
  localStorage.setItem('antigravity_api_proxy', proxy || 'https://api.anthropic.com/v1/messages');
  
  alert('API settings saved successfully!');
  closeSettingsModal();
}

// init
liveEMI();
loadChatHistory();