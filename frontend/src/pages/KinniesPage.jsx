const KINNIES = [
  {
    id: 1,
    name: 'Legoshi',
    fandom: 'Beastars',
    img: 'https://media1.tenor.com/m/A_cNTIvbKhQAAAAC/legoshi-legosi.gif',
  },
  {
    id: 2,
    name: 'Norman',
    fandom: 'The Promised Neverland',
    img: 'https://media1.tenor.com/m/UN7wQnKuEX8AAAAd/norman-the-promised-neverland.gif',
  },
  {
    id: 3,
    name: 'Isobe',
    fandom: 'A Girl on the Shore',
    img: 'https://64.media.tumblr.com/896eaf234647f9b71e569749fc264d85/1833258337f81076-9d/s640x960/93056afb07f90dee9881c92dffcbb428e17a7802.pnj',
  },
  {
    id: 4,
    name: 'Shizuku Murasaki',
    fandom: 'Hunter x Hunter',
    img: 'https://media1.tenor.com/m/IxnujD-sCzcAAAAC/shizuku-hunter-x-hunter.gif',
  },
];

export default function KinniesPage() {
  return (
    <main className="card">
      <div className="pageHeader">
        <h1>kinnies</h1>
        <p className="tinyText">personajes con los que me identifico ✨</p>
      </div>

      <div className="kinnieGrid">
        {KINNIES.map(k => (
          <div key={k.id} className="kinnieCard">
            <img
              src={k.img}
              alt={k.name}
              className="kinnieImg"
              onError={e => {
                e.currentTarget.style.background = 'rgba(255,0,255,0.08)';
                e.currentTarget.style.minHeight = '120px';
              }}
            />
            <div className="kinnieInfo">
              <span className="kinnieName">{k.name}</span>
              <span className="kinnieFandom">{k.fandom}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
