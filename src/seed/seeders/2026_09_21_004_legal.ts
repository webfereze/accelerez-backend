import type { DataSource } from "typeorm";
import { PageEntity } from "@shared/entities";
import { PageStatus } from "@shared/enums/page-status.enum";

/**
 * The three pages a site that holds accounts, payments and video recordings
 * cannot go live without.
 *
 * **Seeded as drafts of a lawyer's job, not as legal text.** Each says plainly,
 * at the top, that it has to be reviewed before launch — a placeholder policy
 * that reads like a finished one is the kind nobody remembers to replace, and
 * this product stores personal video of identifiable people.
 */

const NOTICE = {
  ro: "<p><strong>De completat înainte de lansare.</strong> Textul de mai jos este o schiță tehnică: descrie ce face efectiv platforma, ca punct de plecare pentru consultantul juridic. Nu este un document juridic și nu a fost verificat.</p>",
  hu: "<p><strong>Indulás előtt kitöltendő.</strong> Az alábbi szöveg technikai vázlat: azt írja le, mit csinál ténylegesen a platform, kiindulópontként a jogi tanácsadónak. Nem jogi dokumentum, és nem ellenőrizték.</p>",
  en: "<p><strong>To be completed before launch.</strong> The text below is a technical draft describing what the platform actually does, as a starting point for legal counsel. It is not a legal document and has not been reviewed.</p>",
};

const PAGES = [
  {
    slug: "termeni-si-conditii",
    title: { ro: "Termeni și condiții", hu: "Felhasználási feltételek", en: "Terms and conditions" },
    body: {
      ro: `${NOTICE.ro}<h2>Ce este platforma</h2><p>Acceleratorul de Rezultate este un intermediar între cursanți și antrenori personali. Contractul de antrenament se încheie între cursant și antrenor; platforma nu prestează servicii de antrenament și nu răspunde pentru conținutul programelor.</p><h2>Conturi</h2><p>Conturile de cursant se creează prin înregistrare. Conturile de antrenor sunt create exclusiv de administrator, după verificarea certificărilor.</p><h2>Plata</h2><p>Plata lunară se face direct către antrenor. Antrenorul confirmă luna în platformă, iar confirmarea deschide accesul cursantului la materiale pentru luna respectivă. Platforma nu încasează și nu returnează sume de bani.</p><h2>Conținut încărcat de cursanți</h2><p>Videoclipurile încărcate de cursant sunt vizibile exclusiv antrenorului la care este înscris. Cursantul își poate șterge oricând propriile înregistrări.</p>`,
      hu: `${NOTICE.hu}<h2>Mi a platform</h2><p>Az Acceleratorul de Rezultate közvetítő a sportolók és a személyi edzők között. Az edzési szerződés a sportoló és az edző között jön létre; a platform nem nyújt edzési szolgáltatást, és nem felel a programok tartalmáért.</p><h2>Fiókok</h2><p>A sportolói fiókok regisztrációval jönnek létre. Az edzői fiókokat kizárólag az adminisztrátor hozza létre, a képesítések ellenőrzése után.</p><h2>Fizetés</h2><p>A havi díjat közvetlenül az edzőnek fizeted. Az edző megerősíti a hónapot a platformon, és ez a megerősítés nyitja meg a sportoló hozzáférését az adott hónapra. A platform nem szed be és nem térít vissza pénzt.</p><h2>Feltöltött tartalom</h2><p>A sportoló által feltöltött videók kizárólag annak az edzőnek láthatók, akihez beiratkozott. A sportoló bármikor törölheti a saját felvételeit.</p>`,
      en: `${NOTICE.en}<h2>What the platform is</h2><p>Acceleratorul de Rezultate is an intermediary between clients and personal trainers. The training agreement is between the client and the trainer; the platform provides no training services and is not responsible for the content of the programmes.</p><h2>Accounts</h2><p>Client accounts are created by registration. Trainer accounts are created only by an administrator, after certifications have been checked.</p><h2>Payment</h2><p>The monthly fee is paid directly to the trainer. The trainer confirms the month in the platform, and that confirmation opens the client's access to the material for that month. The platform neither collects nor refunds money.</p><h2>Content uploaded by clients</h2><p>Videos uploaded by a client are visible only to the trainer they are enrolled with. A client may delete their own recordings at any time.</p>`,
    },
  },
  {
    slug: "confidentialitate",
    title: { ro: "Politica de confidențialitate", hu: "Adatvédelmi tájékoztató", en: "Privacy policy" },
    body: {
      ro: `${NOTICE.ro}<h2>Ce date colectăm</h2><p>La înregistrare: nume, adresă de e-mail, opțional telefon și limba preferată. În cursul utilizării: cererea de înscriere scrisă de cursant, lunile confirmate ca plătite, materialele primite de la antrenor și videoclipurile încărcate de cursant.</p><h2>Cine le vede</h2><p>Antrenorul vede datele cursanților înscriși la el. Un cursant nu vede datele altui cursant. Administratorul are acces pentru suport și pentru verificarea plăților.</p><h2>Videoclipuri</h2><p>Videoclipurile încărcate sunt stocate pe serverul platformei și sunt accesibile doar perechii cursant–antrenor. Ele nu sunt folosite în scopuri de promovare fără acord scris separat.</p><h2>Drepturile tale</h2><p>Ai dreptul să ceri o copie a datelor tale, corectarea lor sau ștergerea contului. Ștergerea contului elimină și înregistrările încărcate.</p>`,
      hu: `${NOTICE.hu}<h2>Milyen adatokat gyűjtünk</h2><p>Regisztrációkor: név, e-mail cím, opcionálisan telefonszám és a választott nyelv. Használat közben: a sportoló által írt jelentkezés, a fizetettként megerősített hónapok, az edzőtől kapott anyagok és a feltöltött videók.</p><h2>Ki látja</h2><p>Az edző a hozzá beiratkozott sportolók adatait látja. Egy sportoló nem látja más sportoló adatait. Az adminisztrátornak támogatási és fizetésellenőrzési célból van hozzáférése.</p><h2>Videók</h2><p>A feltöltött videók a platform szerverén tárolódnak, és csak a sportoló–edző páros számára hozzáférhetők. Külön írásos hozzájárulás nélkül nem használjuk őket promócióra.</p><h2>Jogaid</h2><p>Kérheted adataid másolatát, helyesbítését vagy a fiók törlését. A fiók törlése a feltöltött felvételeket is eltávolítja.</p>`,
      en: `${NOTICE.en}<h2>What we collect</h2><p>At registration: name, e-mail address, optionally a telephone number and preferred language. During use: the enrolment request the client writes, the months confirmed as paid, the material received from the trainer and the videos the client uploads.</p><h2>Who sees it</h2><p>A trainer sees the data of clients enrolled with them. One client never sees another's. An administrator has access for support and for checking payments.</p><h2>Videos</h2><p>Uploaded videos are stored on the platform's server and are accessible only to that client–trainer pair. They are not used for promotion without separate written consent.</p><h2>Your rights</h2><p>You may ask for a copy of your data, for it to be corrected, or for your account to be deleted. Deleting the account also removes the uploaded recordings.</p>`,
    },
  },
  {
    slug: "cookie-uri",
    title: { ro: "Politica de cookie-uri", hu: "Süti tájékoztató", en: "Cookie policy" },
    body: {
      ro: `${NOTICE.ro}<h2>Ce folosim</h2><p>Platforma folosește stocare locală în browser pentru a te ține autentificat și pentru a reține limba aleasă. Nu folosim cookie-uri de publicitate și nu partajăm date cu rețele de reclame.</p><h2>Analytics</h2><p>Dacă va fi adăugat un instrument de măsurare a traficului, va fi menționat aici înainte de activare, împreună cu opțiunea de refuz.</p>`,
      hu: `${NOTICE.hu}<h2>Mit használunk</h2><p>A platform a böngésző helyi tárolóját használja, hogy bejelentkezve tartson és megjegyezze a választott nyelvet. Nem használunk hirdetési sütiket, és nem osztunk meg adatot hirdetési hálózatokkal.</p><h2>Analitika</h2><p>Ha forgalommérő eszköz kerül be, azt itt jelezzük az aktiválás előtt, a visszautasítás lehetőségével együtt.</p>`,
      en: `${NOTICE.en}<h2>What we use</h2><p>The platform uses browser local storage to keep you signed in and to remember the language you chose. We use no advertising cookies and share no data with ad networks.</p><h2>Analytics</h2><p>If a traffic measurement tool is added, it will be named here before it is switched on, together with the way to refuse it.</p>`,
    },
  },
];

export async function run(dataSource: DataSource) {
  const pages = dataSource.getRepository(PageEntity);

  for (const page of PAGES) {
    if (await pages.findOne({ where: { slug: page.slug } })) {
      console.log(`  · /${page.slug} already exists — left alone`);
      continue;
    }

    await pages.save(
      pages.create({
        slug: page.slug,
        title: page.title,
        status: PageStatus.PUBLISHED,
        publishedAt: new Date(),
        // Legal pages are for the people who go looking for them, not for
        // search results: three near-identical policy pages are exactly the
        // thin content that drags a domain down.
        noindex: true,
        content: [
          {
            id: `${page.slug}-body`,
            type: "richText",
            data: { background: "none", html: page.body },
          },
        ],
      } as never),
    );
    console.log(`  · created /${page.slug}`);
  }
}
