/**
 * AlienPoker.jsx — 5 cartas vs dealer. Mano más alta gana x2. Empate x1.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';

const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS = ['♠','♣','♥','♦'];
const RED = new Set(['♥','♦']);

function buildDeck() { return SUITS.flatMap(s => RANKS.map(r => ({ s, r, v: RANKS.indexOf(r) }))); }
function shuffle(d) { const a=[...d]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

function handRank(cards) {
  const vals = cards.map(c => c.v).sort((a,b) => a-b);
  const suits = cards.map(c => c.s);
  const counts = {}; vals.forEach(v => { counts[v]=(counts[v]||0)+1; });
  const freq = Object.values(counts).sort((a,b)=>b-a);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = vals[4]-vals[0]===4 && new Set(vals).size===5;
  if (isFlush && isStraight) return { rank:8, name:'Straight Flush' };
  if (freq[0]===4) return { rank:7, name:'Cuatro iguales' };
  if (freq[0]===3&&freq[1]===2) return { rank:6, name:'Full House' };
  if (isFlush) return { rank:5, name:'Color' };
  if (isStraight) return { rank:4, name:'Escalera' };
  if (freq[0]===3) return { rank:3, name:'Trío' };
  if (freq[0]===2&&freq[1]===2) return { rank:2, name:'Doble par' };
  if (freq[0]===2) return { rank:1, name:'Par' };
  return { rank:0, name:`Carta alta (${RANKS[vals[4]]})` };
}

function CardUI({ card }) {
  const isRed = RED.has(card.s);
  const accent = isRed ? '#ff4d8d' : '#00e5ff';
  return (
    <div style={{ width:52, height:76, borderRadius:8, background:'rgba(255,255,255,0.06)', border:`1px solid rgba(255,255,255,0.15)`, display:'flex', flexDirection:'column', justifyContent:'space-between', padding:5, color:accent, flexShrink:0 }}>
      <div style={{ fontSize:'0.8rem', fontWeight:900 }}>{card.r}</div>
      <div style={{ fontSize:'1.2rem', textAlign:'center' }}>{card.s}</div>
      <div style={{ fontSize:'0.8rem', fontWeight:900, alignSelf:'flex-end', transform:'rotate(180deg)' }}>{card.r}</div>
    </div>
  );
}

function PokerGame({ bet, balance, finishGame }) {
  const [state, setState] = useState('idle'); // idle | dealt
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);

  const deal = useCallback(() => {
    const deck = shuffle(buildDeck());
    setPlayerHand(deck.slice(0,5));
    setDealerHand(deck.slice(5,10));
    setState('dealt');
    const ph = handRank(deck.slice(0,5));
    const dh = handRank(deck.slice(5,10));
    setTimeout(() => {
      let multi, msg;
      if (ph.rank > dh.rank) { multi=2; msg=`🏆 ${ph.name} vs ${dh.name}`; }
      else if (ph.rank === dh.rank) { multi=1; msg=`🤝 Empate: ${ph.name}`; }
      else { multi=0; msg=`❌ ${ph.name} vs ${dh.name} — dealer gana`; }
      setTimeout(() => finishGame(multi, msg), 1200);
    }, 200);
  }, [finishGame]);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20, padding:'20px 16px', width:'100%' }}>
      <CasinoHUD balance={balance} bet={bet} />
      <div style={{ marginTop:56, textAlign:'center' }}>
        <div style={{ fontSize:52 }}>🎭</div>
        <h2 style={{ color:gold, fontWeight:900, margin:'8px 0 4px' }}>ALIEN POKER</h2>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.85rem', margin:0 }}>5 cartas vs dealer. Mano más alta gana x2. Empate x1.</p>
      </div>

      {state === 'dealt' ? (
        <>
          <div style={{ textAlign:'center' }}>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.65rem', letterSpacing:2, marginBottom:6 }}>DEALER</div>
            <div style={{ display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap' }}>
              {dealerHand.map((c,i) => <CardUI key={i} card={c} />)}
            </div>
            <div style={{ color:'rgba(255,255,255,0.55)', fontSize:'0.8rem', marginTop:4 }}>{handRank(dealerHand).name}</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ color:gold, fontSize:'0.65rem', letterSpacing:2, marginBottom:6 }}>TU MANO</div>
            <div style={{ display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap' }}>
              {playerHand.map((c,i) => <CardUI key={i} card={c} />)}
            </div>
            <div style={{ color:gold, fontSize:'0.8rem', marginTop:4 }}>{handRank(playerHand).name}</div>
          </div>
        </>
      ) : (
        <motion.button whileTap={{ scale:0.96 }} onClick={deal}
          style={{ background:`linear-gradient(135deg,${gold},#e6a800)`, color:'#000', border:'none', borderRadius:14, padding:'14px 48px', fontSize:'1.1rem', fontWeight:900, cursor:'pointer' }}>
          🃏 REPARTIR
        </motion.button>
      )}
    </div>
  );
}

export default function AlienPoker() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = useCasinoBet('alien-poker', 'Alien Poker');
  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance} onPlay={placeBet} isLoading={isLoading} isVIP={isVIP} title="Alien Poker" icon="🎭" description="Poker 5 cartas vs dealer. Gana con mejor mano. x2 ganar, x1 empate." />}
        {phase === 'playing' && <motion.div key="game" initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ width:'100%', maxWidth:420, position:'relative' }}><PokerGame bet={bet} balance={balance} finishGame={finishGame} /></motion.div>}
        {phase === 'result' && <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
