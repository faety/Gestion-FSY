# Leçons — ce qui a coûté du temps une fois

Chaque point a été payé pendant Gestion FSY 2026. Le kit en tient compte ;
cette page sert quand on sort du kit.

## DNS et domaines

- **Ne jamais rien créer SOUS un sous-domaine servi par un générique.** Le
  site `2026.fsy.ci` était servi par `*.fsy.ci`. En branchant Resend dessus,
  la création de `send.2026.fsy.ci` a fait de `2026.fsy.ci` un nœud vide de
  la zone : le générique a cessé de le servir (RFC 4592) et le site a disparu
  du DNS du jour au lendemain. Un sous-domaine qui doit vivre a **son propre
  enregistrement** ; les services (e-mail, `_dmarc`) se branchent sur le
  domaine racine.
- **L'adresse publique va sur des documents que personne ne corrigera** (QR,
  attestations). `SITE_URL` désigne un nom qui résout vraiment, et il n'est
  écrit qu'à un endroit (`src/lib/site.ts`).
- Chaque nouveau domaine se déclare **aussi dans Vercel** (Domains), même si
  le générique DNS le résout déjà.
- Multi-instances (plusieurs organisations sur le même code) : préférer une
  isolation par sous-domaine — même code, base, compte Cloudinary et
  variables séparés — à une base commune multi-tenant. Monter une instance
  devient une installation, pas un développement.

## Vercel et variables d'environnement

- Une variable ajoutée après un déploiement **n'est visible qu'au déploiement
  suivant**. Redéployer.
- Une valeur saisie **avec ses guillemets** les contient. Resend refuse alors
  l'expéditeur, sans explication à l'écran. `diagnosticEnvoi()` le voit.
- Vercel = une connexion PostgreSQL par fonction serverless : `db.ts` ajoute
  `connection_limit=1&pool_timeout=20`. Sans cela, quelques dizaines
  d'utilisateurs épuisent les connexions de Neon.
- `serverExternalPackages` pour Prisma et bcrypt, sinon le déploiement casse.
- La limite d'une action serveur est de 1 Mo (`bodySizeLimit`) : les images
  passent directement chez Cloudinary, pas par l'action.

## Actions serveur et erreurs

- **En production, Next masque le message d'une erreur levée** dans une
  action : l'utilisateur voit « Une erreur est survenue ». Un refus se
  renvoie : `{ ok: false, motif }`. Le composant l'affiche.
- **Aucune saisie ne se jette en silence.** Un formulaire de « chiffres
  propres au prestataire » ignorait les lignes incomplètes : l'utilisateur
  enregistrait, ne voyait rien changer, et croyait à un bug. Refuser avec un
  message qui nomme la ligne.
- `revalidatePath` après une écriture ; sinon la page connectée montre
  l'ancien état (et le cache du routeur client peut encore le montrer une fois
  — un rechargement le lève, ce n'est pas un bug serveur).
- Ce qu'un composant client garde en état disparaît à la revalidation : un
  lien « réimprimer » stocké côté client s'est volatilisé. Le rendre côté
  serveur depuis la base.

## Sessions et mots de passe

- **Jamais de secret de repli en dur** : sans `AUTH_SECRET` en production,
  lever. Un repli silencieux ouvre la porte à tous les comptes.
- Freiner les essais **sans verrouiller** : verrouiller un compte est un moyen
  commode d'empêcher quelqu'un de travailler le jour J.
- « Mot de passe oublié » répond **toujours la même chose** : sinon le
  formulaire révèle qui a un compte.
- Le jeton de réinitialisation est stocké par **empreinte SHA-256** ; le
  marquage « utilisé » et le changement se font dans **une transaction**.
- Un mot de passe provisoire se **dicte** (« QFYX-2223 », sans 0/O ni 1/l/I)
  et ne s'envoie jamais par e-mail. Il impose un changement à la connexion,
  contrôlé dans le **gabarit** (aucune page atteignable en tapant l'adresse).

## Photos et données de mineurs

- Livraison **signée** (`authenticated`) pour toute image où figurent des
  personnes qui n'ont pas choisi d'être publiques. Vignettes générées par
  Cloudinary, jamais des originaux dans le HTML.
- Contrôler le `public_id` renvoyé par le navigateur (bon dossier, pas de
  `..`) : un formulaire trafiqué pointerait sinon vers n'importe quel fichier.
- Réduire dans le navigateur avant l'envoi : 200 Ko suffisent pour un
  portrait, 4 Mo tuent une connexion mobile.
- La suppression chez Cloudinary a un **délai maximal** (4 s) et n'échoue
  jamais l'action : un fichier orphelin n'a aucune conséquence.
- Données sensibles (médical, contacts) : visibles dans le seul périmètre de
  ceux qui en ont la charge, consultations journalisées, jamais versionnées,
  lues en mémoire seulement à l'import.

## Impression et PDF

- **Paysage = `@page { size: A4 landscape }`**, jamais `rotate(90deg)` : la
  rotation sort à 87 % de la taille, décalée. Mesuré : en page paysage sans
  rotation, l'encre couvre 296,6 × 209,6 mm.
- **Aucune marge au-dessus de la feuille** à l'impression : 1 mm de trop et
  la feuille déborde sur une seconde page blanche. `Apercu` met `margin: 0`
  en print ; pas de `break-after: page` sur la dernière feuille.
- La largeur d'écran de l'aperçu doit **retomber sur celle de la page** à
  l'impression, sinon le moteur rétrécit tout le lot.
- Deux passes quand un lot mélange portrait et paysage : imprimer les deux
  formats séparément plutôt qu'un lot mixte.
- pdf-lib : polices standard = WinAnsi seulement ; `surWinAnsi()` remplace ce
  qui n'y figure pas (flèches, espaces insécables) au lieu de planter sur un
  caractère copié-collé. pdf-lib **compresse ses objets** : pour vérifier un
  PDF, le recharger avec `PDFDocument.load`, ne pas chercher `MediaBox` dans
  les octets.
- Les faits imprimés sur un document délivré sont **figés en base** au moment
  de la délivrance (JSON `faits`), mais les chiffres d'ensemble (effectif d'un
  événement) viennent d'une **source unique** pour rester cohérents d'un
  document à l'autre.
- Accorder les libellés au **genre** de la personne nommée
  (`libelleRoleAccorde`) : « Coordinatrice adjointe », pas « Coordinateur ».

## Tailwind et formulaires

- Deux largeurs sur un même champ (`w-full` + `w-24`) : la dernière classe
  générée gagne, pas la dernière écrite. Un champ a **une** classe de base
  sans largeur, et la largeur se donne à côté.
- `type="button"` sur tout bouton qui n'envoie pas le formulaire (œil du mot
  de passe), sinon un clic soumet.
- Vider `input.value` après un choix de fichier, sinon choisir deux fois le
  même fichier ne déclenche rien.
- `useId()` pour lier étiquette et champ ; les tests Playwright ciblent
  ensuite `getByLabel("…", { exact: true })`.

## Environnement de développement (Claude Code)

- Ne jamais enchaîner `pkill` et une autre commande dans le même appel : le
  `pkill` tue le shell (code 144). Tuer par PID, dans un appel séparé.
- Après un `pkill`, **vérifier que l'ancien serveur est bien mort** avant de
  relancer : un test lancé contre l'ancien build donne des résultats faux.
- Cluster PostgreSQL local hors de `/tmp/claude-*` (permissions réécrites) :
  `/var/tmp/pgdata-<projet>`, port 5433, `--auth=trust`.
- Playwright : `getByRole("button", { name: /regex/i })` pour les libellés
  avec apostrophes ou accents ; `{ exact: true }` quand deux étiquettes se
  chevauchent (« Nom » et « Nom d'usage »).
- Les identifiants GitHub d'une session peuvent expirer (`could not read
  Username`) : reconnecter le connecteur GitHub sur claude.ai ou ouvrir une
  nouvelle session ; en attendant, sauvegarder le travail en `.patch`.
- Un build de vérification s'exécute **seul** dans son appel, avec un délai
  large.
