# Gestion FSY 2026 — Abidjan Ouest

**[fsy.ci](https://fsy.ci)**

Application web de gestion de la conférence FSY 2026 (3 au 8 août 2026, Abidjan Ouest) :
650 participants, hiérarchie de rôles, arrivées/départs par cars, programme, annonces et
rapports quotidiens des encadrants. Une page publique présente la conférence ; tout le
reste est derrière une authentification.

> **Thème 2026 — « Marche avec moi »** (Moïse 6:34)
> « Les montagnes fuiront devant toi et les fleuves se détourneront de leur cours.
> Tu demeureras en moi et moi en toi ; c'est pourquoi, marche avec moi. »

## Participants

**650 inscriptions réelles** importées depuis le fichier d'inscription officiel
(643 approuvées, 6 annulées, 1 en attente), réparties sur **8 pieux et districts** :
Niangon North, Toit Rouge, Dabou, Selmer, Niangon South, Yopougon Attie, Niangon Central
et Tiassale.

### Unités retirées du périmètre

Le fichier d'inscription contenait trois unités qui ne relèvent pas de cette conférence —
**District de Dakar Senegal**, **Mission West** et **Pieu de Roosevelt Utah West** — soit
13 inscriptions (4 approuvées, 8 annulées, 1 en attente). Elles s'y étaient glissées par
erreur lors de l'export et ont été retirées. La liste est conservée dans
`src/lib/perimetre.ts`, pour pouvoir refiltrer un nouvel export sans avoir à retrouver
quelles unités écarter.

### Protection des données personnelles

Les participants sont des mineurs. Les données sont donc séparées en deux :

| Fichier | Contenu | Versionné |
|---|---|---|
| `prisma/participants.json` | Prénom, nom, nom d'usage, sexe, date de naissance, pieu, paroisse, taille de t-shirt, statut d'inscription | **Oui** — nécessaire au fonctionnement (groupes, cars, anniversaires) |
| `data/participants-sensibles.json` | Téléphone, adresse électronique, **renseignements médicaux**, contraintes alimentaires, contacts d'urgence | **Non** — `data/` est exclu du dépôt |

Le dossier `data/` (qui contient aussi le fichier Excel d'origine) n'est jamais versionné.
Pour charger les données sensibles sur une installation :

```bash
npm run import:sensibles    # lit data/participants-sensibles.json
```

Le formulaire d'inscription étant un champ libre, « rien à signaler » y est écrit d'une
vingtaine de façons (`aucun`, `RAS`, `néant`, `pas de régime alimentaire`, `il mange
tout`…). L'import ne conserve que les réponses porteuses d'information : **24 alertes
médicales** et **44 contraintes alimentaires** réelles, au lieu de 650 champs bruts. Les
conseillers voient ainsi des badges qui signalent quelque chose.

Chaque encadrant ne voit que les jeunes de son périmètre : un conseiller son groupe, un
adjoint sa compagnie, un coordinateur tous. Les informations médicales suivent cette
portée.

### Critères d'admission officiels

D'après les rapports par pieu du 29 juillet 2026 (`src/lib/criteres.ts`) :

- **Âge** : au moins **14 ans au 31 décembre 2026** et au plus **18 ans au 3 août 2026**
  (jour et mois pris en compte, pas seulement l'année).
- **Statut** : seul « Approuvée » est accepté. « En attente d'approbation » doit être
  régularisé, « Annulé » n'est pas accepté.

**7 participants approuvés hors critères** sont signalés : six ont plus de 18 ans au
3 août (20, 20, 21, 22, 23 et 28 ans) et un a une date de naissance invalide
(`0012-08-23`). Cette date n'est **pas corrigée silencieusement** : la valeur brute est
conservée dans `dateNaissanceBrute` et signalée, comme le fait le rapport officiel.

### Structure des groupes (affectation officielle)

L'affectation vient du fichier officiel, pas d'un calcul : **36 compagnies de deux groupes**
— groupe 1 = filles, groupe 2 = garçons — soit **72 groupes** de 8 à 10 jeunes (moyenne 9),
nommés `Groupe <compagnie>.<groupe>`.

L'affectation **mélange volontairement les âges et les pieux** : la compagnie 1 réunit des
jeunes de 13 à 17 ans venus de 6 pieux différents. C'est un choix d'organisation en faveur
de l'unité, et non la répartition par tranche d'âge que suggère le manuel de l'encadrant.

### Conseillers à proposer par unité

Formule officielle, appliquée **séparément par sexe** :
`plafond(participants du sexe ÷ 10) + 2`.

| Pieu / district | Inscrits | JF | JG | Conseillères | Conseillers | Total |
|---|--:|--:|--:|--:|--:|--:|
| Pieu de Niangon North | 100 | 66 | 32 | 9 | 6 | 15 |
| Pieu de Toit Rouge | 95 | 47 | 48 | 7 | 7 | 14 |
| District de Dabou | 94 | 53 | 40 | 8 | 6 | 14 |
| Pieu de Selmer | 93 | 52 | 40 | 8 | 6 | 14 |
| Pieu de Niangon South | 90 | 43 | 47 | 7 | 7 | 14 |
| Pieu de Yopougon Attie | 80 | 40 | 40 | 6 | 6 | 12 |
| Pieu de Niangon Central | 71 | 40 | 29 | 6 | 5 | 11 |
| District de Tiassale | 27 | 14 | 13 | 4 | 4 | 8 |
| **Total** | **650** | **355** | **289** | **55** | **47** | **102** |

Les colonnes JF et JG comptent les inscriptions non annulées, qui servent de base à la
formule.

Ces chiffres reproduisent les rapports officiels des quatre pieux fournis (Niangon North,
Toit Rouge, Dabou, Niangon South), ce qui valide l'implémentation. Dabou et Niangon
Central passent respectivement de 15 à 14 et de 12 à 11 conseillers par rapport à la
version précédente, du seul fait du retrait des unités hors périmètre.

Profil attendu : jeune adulte seul de **19 à 35 ans**, non marié ; missionnaire de retour
pour les hommes (non obligatoire pour les femmes) ; recommandation à l'usage du temple ;
formation « Protéger les enfants et les jeunes ».

La page **Pieux et districts** (coordinateurs et adjoints) réunit ces effectifs, les
statuts d'inscription, les cas hors critères et le profil des conseillers.

### Doublons d'inscription probables

**Trois personnes apparaissent deux fois** parmi les inscriptions approuvées, ce qui ramène
643 approbations à 640 jeunes distincts :

| Jeune | Indice |
|---|---|
| Djerou Kady Soroko | Deux fiches identiques : même date de naissance, même paroisse, même groupe. Doublon certain. |
| Kabogbo Chris Uriel Zie | Dates de naissance à six jours d'écart, deux paroisses voisines du même pieu, deux groupes. |
| Yao Evans Seu | Dates de naissance à dix jours d'écart, même paroisse, deux groupes. |

Les deux derniers cas demandent une vérification auprès du pieu : ce sont soit des
doublons de saisie, soit deux jeunes homonymes. La page **Pieux et districts** les
signale, avec les éléments permettant de trancher.

## Équipe d'encadrement

**62 encadrants** (10 coordinateurs adjoints, 52 conseillers) s'ajoutent au couple
dirigeant et aux deux coordinateurs principaux. La liste vient du rapprochement de deux
documents officiels :

| Document | Contenu |
|---|---|
| Suivi des conseillers proposés par les pieux | 91 propositions, avec téléphone et paroisse |
| Liste des coordinateurs adjoints et conseillers | Les personnes ayant **confirmé leur présence**, avec leur rôle définitif |

Les noms sont écrits différemment d'un document à l'autre — ordre inversé, accents
absents, variantes d'orthographe. Le rapprochement (`scripts/` hors dépôt) compare des
ensembles de mots avec tolérance aux fautes de frappe :

- **54 personnes** retrouvées dans les deux documents, avec leur téléphone et leur paroisse ;
- **8 personnes** absentes du premier document — ce sont des remplaçantes ;
- **37 propositions non retenues**, dont Kouassi Allegra Cédric et Yao Aquicy Candela Eméraude, promus coordinateurs principaux ;
- **1 doublon** dans la liste de confirmation (Trazié Bénié Ruth), écarté.

Convention de nommage : dans les listes officielles **le patronyme précède les prénoms**
(« Zilé Patricia Yro » = nom Zilé, prénoms Patricia Yro), comme pour « Kouassi Allegra
Cédric ». L'application respecte cet ordre, sans quoi l'accueil dirait « Bonjour Zilé ».

### Le sexe est déduit, et corrigeable

Il ne figure dans aucun des deux documents. Il est déduit du prénom, ce qui laisse
**deux cas indéterminés** (Fleinde Bovande et Tanoh), enregistrés comme femmes par défaut
— un groupe de filles sans conseillère étant plus difficile à combler. Le sexe compte :
un conseiller n'encadre qu'un groupe du même sexe, et l'application refuse l'inverse.

### Les affectations restent à décider

Aucun des deux documents ne dit **qui encadre quelle compagnie ni quel groupe**. Les
comptes sont donc créés sans affectation :

- **conseillers → groupes** : page *Groupes*, un sélecteur par groupe (même sexe imposé) ;
- **adjoints → compagnies** : page *Administration*, un sélecteur par adjoint.

Deux écarts à connaître, que l'application signale d'elle-même :

| Besoin | Disponible | Écart |
|---|--:|--:|
| 36 groupes de filles | 30 conseillères | **6 groupes** sans conseillère |
| 36 groupes de garçons | 22 conseillers | **14 groupes** sans conseiller |
| 36 compagnies × 2 adjoints | 10 adjoints (5 F / 5 H) | 5 compagnies au plus avec une paire complète |

### Coordonnées

Comme pour les participants, **les numéros de téléphone ne sont pas versionnés**.
`prisma/encadrement.json` ne contient que le nom, le rôle, le sexe, l'unité et la
paroisse. Les 54 numéros connus vivent dans `data/encadrement-contacts.json`, hors dépôt,
chargés par :

```bash
npm run import:contacts
```

## Rapidité

L'application est servie depuis **Francfort** (`vercel.json`, région `fra1`), là où se
trouve la base Neon. Sans cela les fonctions tournaient par défaut aux États-Unis et
chaque requête traversait l'Atlantique : une centaine de millisecondes multipliée par le
nombre de requêtes d'une page — plus d'une seconde pour l'accueil, qui en fait treize.

Deux corrections mesurées en local, base à côté :

| Page | Avant | Après |
|---|--:|--:|
| `/jeunes` — HTML envoyé | 2 245 ko | **477 ko** |
| `/jeunes` — rendu serveur | 1 321 ms | **113 ms** |

Les 650 fiches étaient toutes rendues d'un coup. Elles le sont désormais par **40**, avec
un bouton pour la suite ; la recherche continue de porter sur la liste entière, donc elle
reste instantanée. Le compteur d'anniversaires de l'accueil chargeait les 650 jeunes et
leurs relations à chaque affichage pour n'en retenir qu'un ou deux : le filtre sur le jour
et le mois se fait maintenant en base.

Les autres pages tiennent entre 40 et 150 ms côté serveur.

## Rapports quotidiens des encadrants

Chaque conseiller, adjoint, coordinateur principal et membre du couple dirigeant remplit
**un rapport par journée** de conférence. Le formulaire est conçu pour se remplir en deux
minutes sur un téléphone : presque tout se fait au doigt, et seuls deux champs de texte
sont proposés, volontairement courts.

Le questionnaire est décrit de façon déclarative dans `src/lib/rapports.ts` : un seul
endroit à modifier pour ajouter une question. Les réponses sont stockées en JSON, donc le
questionnaire évolue sans migration de base.

### Ce sur quoi chacun rapporte

| Section | Qui | Ce qui est demandé |
|---|---|---|
| **L'ambiance du jour** | tous | Une échelle de cinq visages : de « excellente » à « très difficile » |
| **Mes jeunes** | conseillers, adjoints | Présences (et qui manquait), participation aux activités, incidents (conflit, mal du pays, règles non respectées, objet interdit, blessure, sortie non autorisée, retards), santé (fatigue, fièvre, infirmerie, traitement à poursuivre…) |
| **Vie spirituelle** | tous | Ce qui a été tenu (dévotion du matin, classe, veillée, prière, étude, entretien personnel), et tout moment marquant vécu par un jeune |
| **Intendance et logistique** | tous | Dix points, chacun en un appui — *ça va* / *souci* / *non concerné* : repas à l'heure, quantité suffisante, eau potable, dortoirs, sanitaires, électricité, sonorisation, sécurité du site, propreté, trousse de secours |
| **Mon équipe d'encadrement** | adjoints et au-dessus | Forme de l'équipe, encadrants absents, coordination (réunions tenues, consignes transmises, programme respecté, retards) |
| **Décisions et arbitrages** | coordinateurs et couple dirigeant | Décisions prises, points à arbitrer le lendemain |
| **En deux phrases** | tous | Ce qui a bien marché, ce qui a moins marché, et une case « j'ai besoin d'aide » avec précision |
| **Photos** | tous | Une ou deux photos facultatives, réduites par le navigateur avant l'envoi |

Chacun ne voit que les sections qui le concernent : un conseiller n'a pas la partie
« décisions », un coordinateur n'a pas la partie « mes jeunes ».

Une case « j'ai besoin d'aide » remonte la demande **en tête du rapport final**, là où les
coordinateurs la verront.

### Points et récompenses

Rendre son rapport rapporte des points, jusqu'à **35 par jour** :

| Geste | Points |
|---|--:|
| Rapport remis | 10 |
| Remis avant 22 h | 5 |
| « Ce qui a marché » renseigné | 3 |
| « Ce qui a moins marché » renseigné | 3 |
| Au moins une photo | 4 |
| Intendance entièrement renseignée | 5 |
| Rapport de la veille également remis (série) | 5 |

Les points sont **calculés côté serveur**, jamais fournis par le navigateur. À l'envoi,
une fenêtre de félicitations affiche des confettis et un compteur qui monte jusqu'au score
obtenu, le total de la conférence et le niveau atteint (🌱 Nouveau, ⭐ Régulier,
🌟 Fiable, 🏅 Pilier, 🏆 Référence). Un indicateur 🔥 signale les séries de plusieurs
jours consécutifs, et un classement « Les plus assidus » est visible de tous. Le réglage
système « réduire les animations » est respecté.

Un rapport peut être corrigé : le renvoyer remplace le précédent et recalcule les points,
sans créer de doublon.

### Photos

Les photos sont réduites **dans le navigateur** avant l'envoi : côté ramené à 1100 px, puis
baisse de la qualité JPEG et, si cela ne suffit pas, réduction de la taille — jusqu'à
tenir sous ~140 ko. Cela économise le forfait de données de l'encadrant.

Elles sont ensuite stockées chez **Cloudinary** (`src/lib/cloudinary.ts`). Le navigateur
les envoie **directement** à Cloudinary, sans passer par l'application : c'est plus rapide
sur une connexion mobile, et cela contourne la limite de taille d'une action serveur. La
clé secrète ne quitte jamais le serveur, qui se contente de signer l'envoi.

**Les photos sont protégées.** Elles sont déposées en type `authenticated` : Cloudinary ne
les sert que par une URL signée que seule l'application peut produire. Ce sont des images
prises pendant une activité de mineurs ; elles n'ont pas à être accessibles à qui
tomberait sur le lien.

La base ne conserve qu'un identifiant. Cloudinary produit la taille demandée à la volée :
vignette de 400 px sur la synthèse, 600 px dans le formulaire, 1400 px à l'appui. Sans
cela, la page de synthèse intégrait toutes les photos dans son HTML — mesuré à **43 ko
avec Cloudinary**, contre plusieurs centaines de mégaoctets à plein effectif.

Retirer une photo la supprime aussi chez Cloudinary. Cette suppression est **bornée à
4 secondes** : le ménage ne doit jamais retarder l'enregistrement d'un rapport. Au pire un
fichier reste chez Cloudinary, sans conséquence — il n'est plus référencé.

Trois variables d'environnement suffisent : `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. **Si elles sont absentes, tout retombe sur
l'ancien stockage en base** : l'application reste utilisable sans Cloudinary, une panne du
service n'empêche pas de remettre un rapport, et les photos déjà envoyées de cette façon
restent lisibles. Pour servir les photos en accès libre par lien plutôt qu'en URL signée,
ajouter `CLOUDINARY_PHOTOS_PUBLIQUES=1`.

### Rapport final

`/rapports/final` (coordinateurs principaux et couple dirigeant) agrège tous les rapports
quotidiens et se met à jour à chaque nouveau rapport :

- **Demandes d'aide** en tête, puisque ce sont elles qui appellent une action ;
- taux de remise jour par jour et par niveau de responsabilité ;
- ambiance déclarée, moyenne globale et répartition ;
- **intendance classée par nombre de soucis signalés** — le haut de liste est ce qu'il faut corriger, avec les jours concernés ;
- incidents, santé, participation, vie spirituelle, coordination, état des équipes ;
- absences signalées, avec les précisions saisies ;
- tout ce que les encadrants ont écrit, groupé par jour et attribué ;
- moments marquants, décisions et arbitrages ;
- galerie des photos.

Trois sorties : **copier le texte** (Markdown, pour le coller dans un courriel ou un
document), **télécharger** le fichier, ou **imprimer / enregistrer en PDF** — une feuille
de style d'impression retire la navigation et les ombres.

L'agrégation est faite dans `src/lib/synthese.ts` : la page affichée et l'export texte
partent du même objet, ils ne peuvent donc pas se contredire.

## Anniversaires pendant la conférence

**10 jeunes** fêtent leur anniversaire entre le 2 et le 8 août 2026 (bornes incluses) :

| Date | Jeunes |
|---|---|
| dim. 2 août *(veille)* | 1 |
| lun. 3 août *(J1)* | 5 |
| mer. 5 août *(J3)* | 1 |
| jeu. 6 août *(J4)* | 1 |
| ven. 7 août *(J5)* | 1 |
| sam. 8 août *(J6)* | 1 |

Pour chaque date concernée, **trois annonces sont programmées à l'avance** — 18 au total :

| Échéance | Heure | Destinataires | Contenu |
|---|---|---|---|
| **J-2** | 8 h | Couple dirigeant et coordinateurs | Liste des jeunes avec âge et groupe, et ce qu'il reste à préparer (gâteau, moment de célébration à inscrire au programme, information des conseillers) |
| **J-1** | 8 h | Couple dirigeant et coordinateurs | Rappel et dernières vérifications |
| **Jour J** | 7 h | Tout le staff | Liste des jeunes à fêter, pour que les conseillers et les compagnies célèbrent |

Une annonce dont la date de publication est future reste **invisible** jusqu'à l'échéance.
Les coordinateurs voient la file des annonces à venir (`🕗 Annonces programmées`) et
peuvent en supprimer une. Les annonces générées automatiquement sont repérées comme
telles et régénérées à chaque amorçage.

Les jeunes concernés portent un badge 🎂 sur la page Jeunes, filtrable, et l'accueil
affiche un bandeau les jours d'anniversaire.

## Programme de la conférence

Le programme chargé dans l'application (`prisma/programme-fsy2026.ts`) couvre la veille
et les 6 jours de la conférence, du dimanche 2 au samedi 8 août 2026 — **138 activités,
dont 136 aux horaires officiels**.

**Sources**
1. *Manuel du participant — Conférence Jeunes, soyez forts 2026 : Marche avec moi*
   (PD80053002 140) : programmes des 1er au 5e jours.
2. *Manuel de l'encadrant* (PD80049773 140) : emploi du temps des encadrants du jour zéro
   au 6e jour, réunions d'encadrants, et **rôle attendu de chaque niveau hiérarchique pour
   chaque activité**.
3. Canevas des réunions spirituelles matinales des jours 2, 3 et 4 (PD80061859 140) :
   thèmes doctrinaux.

### Rôle attendu par activité

C'est l'apport central du manuel de l'encadrant : pour chaque activité, il précise ce que
fait chaque niveau. L'application affiche ce rôle et met en évidence ceux qui engagent une
responsabilité directe (`★ Vous dirigez`, `★ Vous enseignez`, `★ Vous supervisez`,
`★ Vous recevez l'appel`), par opposition à `Vous assistez`, `Si vous le souhaitez` ou
`Si la tâche vous est attribuée`.

Un conseiller ouvre l'application et voit ses **8 activités à diriger** du jour 2 (réunion
spirituelle des participants, étude de l'Évangile, appels, bannière et cri de ralliement,
directives du bal, « Réfléchir et revoir »…) sans avoir à les chercher dans le manuel.

Le rôle sert aussi de filtre : les réunions d'encadrants qui ne concernent pas un niveau
lui sont masquées. Un conseiller ne voit pas la réunion coordinateurs/adjoints de 13 h 50,
ni la réunion couple dirigeant/instructeurs de 8 h 45.

### Structure des journées

| Jour | Date | Tenue encadrants | Tenue jeunes | Temps forts |
|---|---|---|---|---|
| **Veille** | dim. 2 août | Vêtements du dimanche | — | *Encadrants uniquement* : visite du lieu, réunion d'accueil des conseillers, message du couple dirigeant, entretiens et planification |
| 1 | lun. 3 août | Tee-shirt encadrant | Décontractée | Réunion des encadrants ; arrivée 11h–13h ; rencontre du conseiller et de la compagnie ; réunion d'accueil ; soirée au foyer et fixation des buts |
| 2 | mar. 4 août | Tee-shirt encadrant | Décontractée | **1er jour des cours** ; « Les montagnes fuiront » ; bannière et cri de ralliement ; **bal** |
| 3 | mer. 5 août | Tee-shirt encadrant | **Tee-shirt FSY** | **Dernier jour des cours** ; « Demeure en moi » ; soirée jeux et cris de ralliement ; soirée plat préféré |
| 4 | jeu. 6 août | Vêtements du dimanche | Vêtements du dimanche | Réunions et activités **séparées** JG/JF ; spectacle de variétés ; spectacle musical ; veillée ; **réunions de témoignage** |
| 5 | ven. 7 août | Tee-shirt encadrant | Décontractée | Revue des buts ; activité du guide FSY ; « Vivre l'Évangile » ; bal ; message « À emporter chez soi » ; **veille de nuit** |
| 6 | sam. 8 août | Tee-shirt encadrant | Décontractée | **Départs dès 7 h** : préparation 6h30, vérification des chambres 7h–7h30, réunion de clôture 7h30–8h30 |

Ossature quotidienne (jours 2 à 5) : réunion adjoints/conseillers (7h00), réunion
spirituelle des participants par groupe (7h15), petit-déjeuner, étude de l'Évangile en
compagnie, réunion spirituelle du couple dirigeant, activités, appels, « Réfléchir et
revoir » par groupe (21h45), extinction des feux (22h30) et réunion coordinateurs/adjoints.

### Le programme est le même pour tous, les attentes diffèrent

Les quatre sections du manuel de l'encadrant — conseiller, coordonnateur adjoint,
coordonnateur, couple dirigeant — publient **le même tableau horaire** : la journée
entière, à l'identique. Ce qui change d'une section à l'autre, ce sont les instructions
qui suivent le tableau : ce que chaque niveau est attendu d'y faire.

Le rôle `AUCUN` efface l'activité du programme de ce niveau. L'appliquer au coordinateur
principal ou au couple dirigeant contredisait donc le manuel : ils n'avaient plus rien
avant sept heures, plus rien après vingt-deux heures, et **l'appel — le moment où l'on
compte les jeunes — ne figurait nulle part chez eux**. Ces deux niveaux n'ont plus aucun
`AUCUN` : à défaut de tâche assignée, c'est `FACULTATIF`, qui dit la vérité — ils peuvent
y être.

Deux conséquences tirées des instructions du manuel :

- **L'appel** : le couple dirigeant *reçoit*, comme les coordinateurs. Il répond de la
  conférence ; un jeune manquant doit lui parvenir.
- **L'extinction des feux et la veille de nuit** : il *supervise*. « Allez voir dans la
  zone des dortoirs si les jeunes vont bien » (section couple dirigeant, suggestions
  générales).

Les conseillers et les coordonnateurs adjoints gardent leurs `AUCUN` : leur programme
reste celui de leur périmètre, sans quoi il deviendrait illisible le jour même.

#### Appliquer une correction à une base déjà semée

Le programme n'est semé qu'à la création de la base : corriger le fichier de référence ne
touche pas une base déjà remplie, et c'est le cas de la production. Sans quoi une
correction du manuel resterait dans le code sans jamais atteindre ceux qu'elle concerne.

La page Programme propose donc aux coordinateurs **« Rôles du programme officiel »**, qui
rejoue la référence sur les activités officielles déjà présentes. Elle ne touche qu'aux
quatre champs de rôle : ni les titres, ni les horaires, ni les lieux, ni les activités
ajoutées sur place. L'appariement se fait par titre puis par ordre chronologique — et non
par horodatage, car quatorze activités s'appellent « Rassemblement en compagnie | Appel »
et comparer des dates construites en heure locale serait fragile. Un titre dont le nombre
d'occurrences ne correspond plus a été modifié sur place : il est laissé tel quel, et
signalé. L'opération est journalisée et rejouable sans effet.

### Divergences entre les deux manuels

Les manuels se contredisent sur trois points ; voici les arbitrages retenus, tous
documentés en tête de `prisma/programme-fsy2026.ts` :

| Point | Manuel du participant | Manuel de l'encadrant | Retenu |
|---|---|---|---|
| J5, message « À emporter chez soi » | 20h15–21h45 | 20h15–20h45 | **Encadrant** — 21h45 chevauchait l'activité de 21h |
| J6, réunion de clôture | absent | 7h30–8h *(tableau)* / 7h30–8h30 *(3 sections)* | **7h30–8h30** |
| J4, répétition du medley | Jeunes Gens seulement | Jeunes Gens **et** Jeunes Filles | **Encadrant** |

### Statuts et ajustements locaux

| Statut | Signification |
|---|---|
| **PLANIFIE** | Horaire officiel des manuels (136 activités) |
| **A_CONFIRMER** | Horaires de la veille laissés libres par le manuel (2 activités) et lieux à renseigner |
| MODIFIE | Changement apporté après publication |
| ANNULE | Activité annulée |

Les manuels sont les manuels FSY *internationaux* : les responsables d'Abidjan Ouest
peuvent adapter certains créneaux et doivent renseigner les lieux. Tout se fait dans
l'application (page Programme) : les coordinateurs principaux modifient directement,
confirment activité par activité (**Confirmer**) ou journée entière (**Confirmer la
journée**), et les coordinateurs adjoints proposent des modifications soumises à
validation. Chaque changement est horodaté dans le journal d'audit.

### Organisation des activités

| Type | Sens |
|---|---|
| `GENERAL` | Tout le monde ensemble |
| `PAR_GROUPE` | Chaque groupe séparément, avec son conseiller |
| `PAR_COMPAGNIE` | Chaque compagnie séparément |
| `COMPAGNIE` / `GROUPE` / `MULTI_GROUPE` | Cibles précises |

Le champ `publicCible` (`TOUS` / `GARCONS` / `FILLES`) gère les activités croisées du
jour 4, et `pourEncadrants` distingue les réunions d'équipe des activités avec les jeunes.

## Démarrage

```bash
cp .env.example .env    # renseigner DATABASE_URL (PostgreSQL) et AUTH_SECRET
npm install
npm run setup           # client Prisma, schéma, données réelles
npm run dev             # http://localhost:3000
```

Voir la section **Base de données** pour l'hébergement et le déploiement.

### Comptes et mots de passe

**66 comptes, tous réels.** Chacun se connecte avec `prenom.nom@fsy2026.ci` et le mot de
passe commun `fsy2026`. **À la première connexion, l'application impose d'en choisir un
autre** : tant que ce n'est pas fait, aucune autre page n'est accessible, même en tapant
son adresse. Il n'y a donc rien à distribuer individuellement.

| Rôle | Nombre | Exemple |
|---|--:|---|
| Couple dirigeant | 2 | `berenger@fsy2026.ci` · `armande@fsy2026.ci` |
| Coordinateurs principaux | 2 | `cedric@fsy2026.ci` · `candela@fsy2026.ci` |
| Coordinateurs adjoints | 10 | `patricia.zile@fsy2026.ci` |
| Conseillers et conseillères | 52 | `kevine.adja@fsy2026.ci` |

La liste complète des adresses est visible sur la page **Administration**.

### Santé et alimentation

`/sante` réunit **tous les jeunes attendus** qui signalent un problème de santé ou une
contrainte alimentaire, quel que soit leur groupe : nom, groupe, compagnie, pieu,
conseiller responsable avec son numéro, et le contact d'urgence — replié par défaut,
soixante numéros de parents affichés en permanence étant une exposition sans usage.

La recherche porte aussi sur le **contenu** de l'alerte, pas seulement sur le nom : à
l'infirmerie ou au réfectoire, on cherche « qui est allergique à l'arachide » avant de
chercher quelqu'un. Les inscriptions annulées sont écartées — faire figurer sur une liste
de vigilance quelqu'un qui n'est pas là ferait perdre du temps.

#### Points de vigilance

La liste seule ne dit pas quoi faire : on n'agit pas de la même façon face à un asthme et
face à une intolérance au lactose. La page range donc les mêmes personnes **par nature de
ce qu'elles ont déclaré**, dans l'ordre du rapport de l'administrateur du bien-être, avec
la conduite à tenir en tête de chaque groupe.

| Nature | Ce qu'elle appelle |
|---|---|
| **Asthme et troubles respiratoires** | Inhalateur sur soi, conseiller prévenu, surveillance pendant le sport. |
| **Allergies médicamenteuses** | À signaler à toute équipe de soins avant la moindre administration. |
| **Allergies et intolérances alimentaires** | À croiser avec le service des repas avant le premier service. |
| **Traitements en cours** | Ordonnance, posologie, conservation, quantité suffisante pour la semaine. |
| **Handicap et accompagnement** | Accompagnement adapté, conseiller informé en amont. |
| **Maladies chroniques et suivis** | Vigilance de fond : hydratation, repos, régularité des prises. |
| **Épisodes et douleurs signalés** | À connaître sans nécessairement mobiliser. |

Le classement est refait **à chaque affichage, depuis la base** — et non recopié d'un
export figé — pour qu'il reste juste quand une inscription change. Les mots recherchés
reproduisent ce que les familles ont réellement écrit, fautes comprises : « astme »,
« asme », « sunisite », « eternuyer ». Une alerte manquée parce qu'un mot était mal
orthographié serait le pire des résultats ; mieux vaut une catégorie de trop qu'un
asthmatique oublié. Ce qu'aucune nature ne reconnaît est rassemblé sous « Autres
déclarations » plutôt que perdu.

**À clarifier.** Certaines déclarations nomment un produit sans dire ce qu'il faut en
faire — « Paracétamol », seul. Allergie ou traitement habituel ? Les deux conduites sont
opposées, et la question doit être posée avant la conférence, pas devant le jeune qui a mal
à la tête. Ces cas sont isolés en tête de page. Ce n'est pas la brièveté qui les distingue :
« Asthmatique », « Toux », « Anémie » tiennent en un mot et se comprennent sans rien
demander — c'est de nommer un produit là où on attendait une condition.

La page reprend aussi la **répartition par pieu et district**, les **recommandations**
permanentes de l'administrateur du bien-être, et les **cas écartés** : les jeunes qui ont
déclaré un renseignement médical mais dont l'inscription n'est pas approuvée. Ils ne sont
pas attendus en l'état, et leur cas devra être réintégré si la situation se régularise —
l'oublier serait une mauvaise surprise le jour même.

#### Verser le fichier d'inscription

Ces renseignements **n'arrivent pas avec le déploiement**. Ils concernent des mineurs, ne
sont donc pas versionnés, et `scripts/importer-sensibles.ts` les charge depuis `data/` — un
dossier absent du dépôt comme de Vercel. Conséquence à ne pas se laisser surprendre : sur
une base de production neuve, la page Santé est **vide**, et un écran vide se lit
« personne n'a rien déclaré », ce qui est la conclusion la plus dangereuse possible. La
page le dit donc explicitement, et propose de verser le fichier.

Le versement se fait **depuis l'application** : on choisit le fichier d'inscription
(`.xlsx`, `.xlsm` ou `.csv`), tel qu'il sort du système d'inscription. Ni machine, ni accès
à la base, ni ligne de commande — ce qui est exactement la situation la veille d'une
conférence.

- **La feuille est choisie seule** (« Tous » de préférence, sinon la plus remplie), les
  lignes de titre au-dessus du tableau sont ignorées, et **les colonnes sont reconnues à
  leur intitulé** : prénom, nom, date de naissance, santé, régime, contact d'urgence,
  téléphone, e-mail. Le résultat de cette reconnaissance est affiché et **se corrige** :
  un intitulé inattendu ne bloque personne.
- **Deux temps, toujours.** Un premier passage montre ce qui serait écrit — lignes lues,
  rattachements, échantillon — sans rien écrire. Six cent cinquante fiches médicales de
  mineurs ne s'écrasent pas à l'aveugle.
- **Le rattachement se fait sur le nom, la date de naissance servant de juge de paix.**
  Quand deux jeunes revendiquent la même ligne avec la même force — deux sœurs, deux
  cousins du même nom — **la ligne n'est pas reprise** et l'écran le dit : attribuer une
  allergie médicamenteuse à la mauvaise personne est précisément ce qu'il ne faut pas
  risquer.
- **Rien n'est jamais effacé.** Une cellule vide laisse en place ce que la base contenait ;
  un export partiel ne peut pas faire disparaître une allergie connue. Verser deux fois le
  même fichier ne crée aucun doublon.
- **« RAS », « Néant », « rien à signaler »** et leurs vingt variantes sont écartés : une
  liste de vigilance où tout le monde figure ne sert plus à personne.
- **Le fichier n'est conservé nulle part** : lu en mémoire, écrit dans la base, et rien
  n'en subsiste — ni sur le disque du serveur, ni dans le dépôt.

Une déclaration se **corrige à l'unité** depuis la fiche du jeune (« Corriger ce
renseignement »). Les familles écrivent vite, dans un champ libre : le rapport du 29
juillet signalait « Asiatique » là où il fallait lire « Asthmatique ». Une faute de ce
genre ne se répare pas dans le fichier d'origine, qui a déjà servi.

#### Ce qui protège ces informations

Ce sont des dossiers médicaux de mineurs, et ils sont traités comme tels.

- **Accès restreint** au couple dirigeant, aux coordinateurs principaux et aux adjoints
  désignés au bien-être — vérifié côté serveur à chaque affichage, pas seulement dans le
  menu.
- **Chaque consultation est journalisée** (`CONSULTATION_SANTE`), une fois par personne et
  par demi-journée : sans trace, personne ne saurait jamais qui a ouvert ces dossiers ;
  en noter chaque rafraîchissement rendrait le journal illisible, ce qui reviendrait au
  même. La page le dit à qui la consulte.
- **Le journal compte, il ne détaille pas.** Un versement s'y inscrit comme « 31 fiches
  complétées », une correction comme le seul nom du jeune : ni pathologie ni allergie n'a
  sa place dans une liste que tous les coordinateurs peuvent lire.
- **Aucune indexation** : `robots: noindex, nofollow, nocache`, et la page est rendue à la
  demande, jamais mise en cache.
- **Le contact d'urgence reste replié** : il ne sert qu'en cas de besoin.
- **Rien de tout cela n'est versionné.** Les renseignements médicaux n'existent que dans la
  base ; `prisma/participants.json`, qui est commité, ne contient ni téléphone, ni e-mail,
  ni médical, ni alimentaire, ni contact d'urgence.

**Qui y accède** : le couple dirigeant et les coordinateurs principaux, qui répondent de la
conférence entière, et les adjoints à qui le couple a accordé le droit **Bien-être**.
Partout ailleurs chacun reste à son périmètre — un conseiller son groupe, un adjoint sa
compagnie — parce que ces renseignements touchent à la santé de mineurs.

#### Droits nominatifs

Deux droits s'accordent personne par personne depuis l'administration, réservés au couple
dirigeant. Ils servent aux responsabilités qui ne suivent pas la hiérarchie : un adjoint
n'a pas à voir toute la conférence du seul fait qu'il est adjoint, mais celui qui porte le
bien-être des jeunes, si.

| Droit | Effet |
|---|---|
| **Modification directe** | Modifie le programme et les affectations sans validation. |
| **Bien-être** | Voit les alertes médicales et alimentaires de tous les jeunes. |

### Mon profil

`/profil` réunit ce que chacun gère lui-même : **photo, numéro de téléphone, adresse
e-mail et mot de passe**. On y arrive par son portrait dans l'en-tête — l'endroit où on le
cherche d'instinct — ou par le menu.

C'est ce qui manquait : `/mot-de-passe` n'était atteignable que par la redirection imposée
à la première connexion, si bien que **personne ne pouvait changer son mot de passe
volontairement**. Cette page ne sert plus qu'au mot de passe provisoire, où rien d'autre ne
doit distraire.

**La photo** est déposée par la personne elle-même, envoyée directement du navigateur vers
Cloudinary dans `fsy2026/profils` — séparé des photos de rapport, qui montrent des mineurs.
Elle est recadrée en carré et réduite à 512 px avant l'envoi : une photo de téléphone fait
plusieurs mégaoctets, ce qui est inutile pour une vignette et lourd sur un réseau mobile.
L'ancienne est effacée quand on la remplace. Sans photo, les initiales s'affichent sur une
couleur tirée du nom, stable d'une page à l'autre : une liste ne devient jamais une colonne
de silhouettes grises.

Soixante-quatre encadrants qui ne se connaissent pas tous se repèrent plus vite avec un
visage. Les portraits apparaissent dans l'en-tête et dans l'organigramme.

**Le numéro** sert le jour même — un conseiller qu'on cherche au départ d'un car, un adjoint
à joindre pour une décision. Chacun renseigne le sien : faire saisir soixante-quatre fiches
par le couple dirigeant garantirait des numéros périmés. Il est visible par l'encadrement
dans l'organigramme, et sur aucune page publique.

L'accueil rappelle discrètement ce qui manque, tant que le profil est incomplet.

### Rattacher une inscription à un compte existant

Une inscription crée **un compte neuf**. Or les 66 comptes d'amorçage existent déjà, avec
le rôle issu des listes officielles, la compagnie et le groupe. Quand quelqu'un qui y
figure s'inscrit avec sa vraie adresse, il se retrouve donc avec **deux comptes** : il se
connecte au nouveau, qui est vide, et ne voit aucun jeune — son groupe étant resté sur
l'ancien. À la clôture, il recevrait deux attestations dont une sans effectif.

La page Administration propose donc, sous chaque inscription en attente, les comptes déjà
en base qui pourraient être la même personne. **Rattacher** conserve l'ancien compte — avec
son rôle, sa compagnie, son groupe, ses rapports — et y transporte ce que l'inscription
apporte : la vraie adresse, le mot de passe choisi, le téléphone. Le doublon disparaît.

Le rapprochement se fait sur les **mots du nom**, sans tenir compte de l'ordre ni des
accents : les deux listes officielles inversaient prénom et patronyme, et personne ne
redonne ses trois prénoms en s'inscrivant. « Marie France Bohoussou » retrouve donc
« Bohoussou Affoué Marie France ».

Chaque proposition porte un degré de confiance — *certain*, *probable*, *à vérifier* — et
**rien n'est jamais fusionné automatiquement** : la liste contient des homonymes (Dea Grace
et Tea Grace), et confondre deux personnes serait pire que le doublon. Un rapprochement
fondé sur un seul mot commun n'est jamais annoncé comme certain.

Un compte qui a déjà servi — rapport écrit, groupe confié, pointages, attestation — ne peut
pas être rattaché : l'opération l'effacerait. L'application refuse et le dit, et renvoie
vers la fusion, qui réunit deux comptes sans rien perdre.

#### La validation refuse de fabriquer un doublon

Le conseil ne suffisait pas. Il était écrit à l'écran, en toutes lettres, et les doublons
sont arrivés quand même : « Valider » est vert, il est à droite, et il paraît être le geste
normal. **La validation refuse donc d'elle-même** tant qu'un rapprochement net — *certain*
ou *probable* — n'a pas été écarté explicitement. Le refus nomme le compte existant et
propose le rattachement.

Personne n'est bloqué pour autant : l'encadrement compte de vrais homonymes, et un bouton
« Ce n'est pas la même personne — créer un compte distinct » passe outre. La différence est
qu'il faut le dire, et que le journal en garde la trace. Quand un rapprochement existe, le
bouton s'intitule d'ailleurs « Valider comme nouveau » et perd sa couleur : ce n'est plus
le geste par défaut.

Le contrôle est **côté serveur**, pas seulement dans l'interface : appeler l'action
directement ne contourne rien.

### Fusionner deux comptes déjà validés

Le rattachement ne vaut que pour une inscription encore en attente, vide de tout. Une fois
la validation faite, le second compte vit sa vie — il reçoit une photo, un téléphone,
parfois un rapport — et la personne **apparaît deux fois dans l'organigramme**. Il faut
alors non plus supprimer, mais réunir.

L'administration signale en tête les **doublons possibles** parmi les comptes validés :
même méthode de rapprochement, mais appliquée à l'équipe entière et non aux seules
inscriptions qui entrent. Deux mots communs sont exigés, jamais un seul — l'encadrement
compte plusieurs Kouassi et plusieurs Grace qui sont bien des personnes différentes.

Chaque doublon s'affiche en deux fiches côte à côte, avec ce que chacune porte : groupe,
rapports, pointages, attestation, photo, téléphone, droits accordés. On choisit **le compte
à garder** ; l'autre vient s'y fondre.

**Fusionner ne supprime rien.** Le compte gardé récupère tout :

| Ce qui suit | Détail |
|---|---|
| Le travail | Groupes dirigés, rapports, pointages, affectations de car, annonces, activités, propositions de modification, journal d'audit. |
| L'identité | Photo, téléphone, date de naissance, pieu, compagnie — chaque champ vide reprend la valeur de l'autre compte. |
| **Les accès** | **L'appel le plus élevé des deux**, et l'**union** des droits nominatifs. Une fusion ne fait jamais perdre un accès que la personne exerçait déjà. |
| La connexion | La **vraie** adresse — jamais un identifiant `@fsy2026.ci`, qui ne reçoit rien — avec le mot de passe que la personne a choisi. |

Trois refus, annoncés plutôt que subis :

- **Le compte avec lequel on est connecté ne peut pas être absorbé** : cela couperait la
  session en cours au milieu de l'opération. Le sens inverse fait la même chose sans le
  risque, et le bouton correspondant est désactivé.
- **Deux rapports pour le même jour** : fusionner en effacerait un. L'application dit
  lesquels et laisse trancher.
- **Deux attestations délivrées** : ce sont des documents imprimés, avec un code de
  vérification. Il faut en révoquer une d'abord.

Seul le **couple dirigeant** peut fusionner des comptes de coordinateur principal ou de
couple dirigeant : réunir deux comptes d'encadrement supérieur revient à décider qui
dirige. L'opération se fait en une transaction et laisse une trace au journal
(`COMPTES_FUSIONNES`) qui détaille ce qui a été repris.

### Envoi d'e-mails (Resend)

Deux variables d'environnement suffisent :

```
RESEND_API_KEY=re_…
EMAIL_EXPEDITEUR=bonjour@fsy.ci    # l'adresse suffit : le nom est ajouté
EMAIL_NOM=FSY 2026                # facultatif : nom affiché, « FSY 2026 » par défaut
SITE_URL=https://fsy.ci           # facultatif : adresse publique, par défaut https://fsy.ci
```

`EMAIL_EXPEDITEUR` accepte l'adresse seule ou la forme complète
`FSY 2026 <bonjour@fsy.ci>`. Dans le premier cas l'application ajoute le nom d'affichage :
sans lui, la boîte de réception montre la partie gauche de l'adresse, et le message arrive
signé **« bonjour »** au milieu de la liste. La page Administration affiche l'expéditeur
tel qu'il sera réellement envoyé.

Le domaine de l'expéditeur doit être **vérifié chez Resend** (enregistrements DNS SPF et
DKIM à ajouter là où est hébergé `fsy.ci`). Sans cette vérification, Resend n'accepte
d'écrire qu'à l'adresse du titulaire du compte. Le forfait gratuit ne vérifie **qu'un seul
domaine** : l'expéditeur doit donc être sur celui-là.

L'avatar affiché à côté du nom vient de la messagerie du destinataire, pas du message.
Y faire figurer le logo demanderait un enregistrement BIMI, qui suppose une politique
DMARC en application et un certificat payant — hors de propos ici.

> **Attention en ajoutant des enregistrements DNS sous un sous-domaine.** La zone `fsy.ci`
> possède un caractère générique `*.fsy.ci` qui pointe vers Vercel : n'importe quel
> sous-domaine résout tout seul. Mais dès qu'on crée un enregistrement **sous** un
> sous-domaine — par exemple `send.2026.fsy.ci` pour Resend — le nom `2026.fsy.ci` devient
> un nœud existant mais vide de la zone, et le générique cesse de s'y appliquer (RFC 4592).
> Le sous-domaine disparaît alors du DNS. C'est ce qui est arrivé à `2026.fsy.ci`, envisagé
> un temps comme adresse officielle, et pourquoi l'application répond désormais sur
> `fsy.ci`, qui a son propre enregistrement. Si un sous-domaine doit servir, lui donner un
> enregistrement A ou CNAME explicite, sans compter sur le générique.

**Sans ces variables, l'application fonctionne exactement comme avant.** Rien ne lève :
le « mot de passe oublié » répond la même chose, et le repli manuel (mot de passe
provisoire dicté par un coordinateur) reste la voie normale. La page Administration
affiche l'état de la configuration et permet de s'envoyer un message d'essai.

Un envoi qui échoue ne fait jamais échouer l'action métier : une messagerie indisponible
n'empêche personne de changer son mot de passe, et ne bloque pas la validation d'une
inscription.

#### Les adresses des 66 comptes ne reçoivent rien

Les comptes créés à l'amorçage portent un identifiant **fabriqué à partir du nom**
(`prenom.nom@fsy2026.ci`) : ce domaine n'existe pas, et les listes officielles ne
donnaient aucune adresse. Écrire à ces adresses ne produirait que des rejets, ce qui
abîmerait la réputation d'envoi du vrai domaine — l'application ne le tente donc jamais.

Deux façons de régulariser :

- **chacun pour soi** — « Mon mot de passe » signale l'identifiant d'attente et propose
  d'enregistrer sa vraie adresse, qui devient alors l'identifiant de connexion ;
- **par l'administration** — le bouton *Adresse à renseigner*, dans le tableau de l'équipe,
  pour quelqu'un qui ne peut justement plus se connecter.

La page Administration compte en permanence les comptes encore concernés.

### Mot de passe oublié par e-mail

Depuis la page de connexion, *Mot de passe oublié ?* envoie un lien valable **trois
heures**, à usage unique. Le jeton n'est jamais conservé en clair : seule son empreinte
SHA-256 est enregistrée, si bien que la lecture de la base ne permet pas de prendre la
main sur un compte.

La réponse affichée est **toujours la même**, que l'adresse existe ou non — sinon ce
formulaire deviendrait un moyen commode de découvrir qui fait partie de l'encadrement.
Trois demandes par heure et par compte au maximum, et toute nouvelle demande annule le
lien précédent.

### Mot de passe oublié, de vive voix

Le repli quand la personne n'a pas d'adresse joignable — c'est le cas de tous les comptes
d'amorçage tant qu'ils n'ont pas été régularisés.

Sur la page **Administration**, chaque ligne porte un bouton *Mot de passe oublié*. Il
génère un mot de passe provisoire de la forme `QFYX-2223`, affiché **une seule fois** pour
être dicté de vive voix. Il évite les caractères que l'on confond en les dictant — pas de
`0`/`O`, pas de `1`/`I`/`l`. La personne s'en sert pour se connecter, puis l'application
lui demande aussitôt d'en choisir un nouveau. Le provisoire n'est stocké nulle part en
clair : le régénérer est la seule façon d'en obtenir un autre.

### L'appel se corrige, il ne se déclare pas

Le formulaire d'inscription proposait de choisir son appel. Plusieurs personnes s'y sont
inscrites comme coordinateur adjoint sans l'être — de bonne foi, puisque le choix leur
était offert. **Ce champ a été retiré** : chacun entre comme conseiller, et le serveur
impose ce rôle même si le champ est réintroduit dans le formulaire.

Les **coordinateurs principaux** corrigent ensuite depuis l'administration, par « Changer
d'appel ». Deux garde-fous :

- l'opération ne porte que sur les conseillers et les adjoints, et ne peut attribuer que
  ces deux appels — sinon un coordinateur pourrait se hisser, ou hisser quelqu'un, au rang
  de couple dirigeant ;
- le changement **emporte ce qui n'a plus de sens** : un conseiller devenu adjoint rend ses
  groupes, un adjoint redevenu conseiller rend sa compagnie **et ses droits nominatifs**.
  Un conseiller qui garderait le droit « Bien-être » verrait les dossiers médicaux de tous
  les jeunes sans que personne l'ait voulu.

Les conséquences sont annoncées avant confirmation, et consignées au journal d'audit.

### Demande de compte

La page de connexion propose **Demander un accès**. Le formulaire recueille nom, prénoms,
adresse, téléphone, sexe et appel (conseiller ou adjoint). Le compte est créé mais **reste
inactif** : la connexion renvoie un message expliquant que l'inscription attend une
validation. Les coordinateurs principaux et le couple dirigeant voient les demandes **en
tête de la page Administration**, avec les éléments permettant de vérifier que la personne
fait bien partie de l'encadrement, et décident : *Valider* ou *Refuser*. Un refus supprime
le compte, la personne peut refaire une demande si c'était une erreur.

### Remise à zéro après une répétition

Réservée au couple dirigeant, sur la page **Administration**. Neuf éléments se cochent
séparément — rapports quotidiens, pointages aux cars, qui coche à quel car, conseillers
affectés aux groupes, adjoints affectés aux compagnies, modifications du programme,
annonces écrites à la main, attestations délivrées, journal d'audit — avec deux
raccourcis : *Données d'essai seulement* (les trois premiers) et *Tout remettre à zéro*.

Il faut taper **EFFACER** pour que le bouton s'active, parce que rien ne se récupère. Les
photos de rapport parties chez Cloudinary sont supprimées avec elles. **Ne sont jamais
touchés** : les comptes, les 650 jeunes, les 36 compagnies, les 72 groupes et le programme
officiel — les activités du programme sont marquées à l'amorçage, et celles qui auraient
été annulées ou modifiées pendant l'essai retrouvent leur statut d'origine.

## Attestations d'encadrement

À la clôture, chaque coordinateur principal, coordinateur adjoint et conseiller reçoit une
**attestation d'encadrement**. Le couple dirigeant délivre, il ne s'atteste pas lui-même.

Le mot « attestation » est choisi à dessein : la conférence n'a aucune accréditation d'État
à revendiquer, et un document honnête et vérifiable pèse plus lourd auprès d'un employeur
qu'un « diplôme » qui laisserait entendre ce qui n'est pas.

### Ce que porte le document

Deux feuilles **A4 portrait** — recto en français, verso en anglais pour les candidatures à
l'étranger et les ONG. Le format portrait est délibéré : c'est celui que sort n'importe
quelle imprimante sans qu'on touche aux réglages, y compris depuis un téléphone.

Sur chaque feuille : le logo officiel, un cadre à double filet, la fonction exercée en
titre, le nom, ce qui a été fait en toutes lettres, un **bandeau de trois chiffres**
(jeunes encadrés, jours de responsabilité, comptes rendus remis), les **compétences mises
en œuvre** nommées dans les termes qu'emploie un recruteur, les deux signatures du couple
dirigeant, le sceau de mention s'il y a lieu, et le QR de vérification avec son code.

### Mentions

L'attestation est remise à **tout le monde** — c'est la semaine donnée qu'elle reconnaît.
La mention distingue en plus la régularité du suivi quotidien :

| Mention | Condition |
|---|---|
| **Excellence** | 7 rapports sur 7 **et** niveau d'assiduité « Pilier » (105 points) |
| **Rigueur et suivi** | au moins 5 rapports sur 7 |
| *(sans mention)* | le document est délivré quand même |

Refuser tout document à quelqu'un qui a veillé une nuit sur un jeune malade mais dont le
téléphone est tombé en panne aurait été injuste. Chacun voit sa progression sur
`/attestation` **avant** la clôture : la mention n'est une surprise pour personne.

### Spécimen et impression de la clôture

Le couple dirigeant délivre mais ne reçoit pas d'attestation : sans spécimen, il signerait
un document qu'il n'aurait jamais vu. **Attestations → Voir un spécimen** montre le
document complet pour chacun des trois rôles, avec des données fictives et la mention
**SPÉCIMEN** en travers de la page — un exemplaire imprimé ne peut donc pas circuler comme
une attestation véritable. Son QR mène à `/verification/SPEC-IMEN`, qui répond
« spécimen », jamais « authentique ».

**Attestations → Imprimer en lot** sort les 64 documents en un seul travail d'impression,
révoquées écartées, dans l'ordre de remise. Les imprimer un par un depuis l'espace de
chacun aurait été impraticable le samedi de la clôture. Deux pages A4 par personne,
exactement — à imprimer en recto-verso.

### Vérification par un employeur

Chaque attestation porte un code à huit caractères (`A7K2-9M4X`), sans les caractères que
l'on confond (`0`/`O`, `1`/`I`/`L`), et un QR qui mène à `fsy.ci/verification/<code>`.
La page est **publique** : elle répond *authentique*, *révoquée* ou *code inconnu*, et
détaille les chiffres. Elle ne publie **aucune coordonnée**.

### Les faits sont figés

Tout est enregistré au moment de la délivrance — effectifs encadrés, rapports remis,
pointages, et jusqu'aux chiffres de la conférence elle-même. Une attestation ne change plus
ensuite, même si les données évoluent : c'est ce qui permet à un employeur de s'y fier des
mois après. La page de délivrance **prévient si des encadrants n'ont pas encore de groupe
ou de compagnie** : leur attestation dirait « un groupe d'adolescents » au lieu de « un
groupe de 9 adolescents », et le chiffre ne pourrait plus être ajouté.

Une attestation délivrée par erreur se **révoque** avec un motif ; elle n'est jamais
effacée, pour que la vérification réponde « plus valable » plutôt que « code inconnu », qui
laisserait croire à une faute de frappe.

### Pour le CV

L'espace de chacun propose une **formulation prête à copier**, accordée au masculin ou au
féminin, avec les effectifs réels. Beaucoup de jeunes adultes ne savent pas valoriser ce
type d'expérience ; leur donner la phrase est sans doute le service le plus concret rendu
ici.

## Sécurité

### Ce que l'application garantit

- **Toute mutation passe par un contrôle d'accès.** Les 41 actions serveur commencent par
  `exiger(rôle)` ou par la vérification de la session ; les cinq qui ne le font pas sont
  celles d'avant-connexion (connexion, inscription, mot de passe oublié), chacune avec ses
  propres protections.
- **La portée des données suit le rôle**, appliquée dans la requête et non à l'affichage :
  un conseiller ne reçoit jamais du serveur les jeunes d'un autre groupe.
- **Le mot de passe oublié ne révèle pas qui a un compte** : réponse identique dans tous
  les cas, jeton haché en base, valable trois heures, à usage unique.
- **Les photos de mineurs** sont servies par URL signée, jamais par lien libre.
- **Les dossiers médicaux sont tracés à la lecture** : `/sante` journalise chaque
  consultation et n'est jamais indexée ni mise en cache.
- **On ne peut pas fabriquer un doublon par inadvertance** : la validation d'une
  inscription refuse tant qu'un compte au même nom n'a pas été écarté explicitement.
- **Aucun secret n'est versionné** : `data/` et `.env` sont exclus du dépôt. Les
  renseignements médicaux et les coordonnées n'existent que dans la base — jamais dans
  `prisma/participants.json`, qui est commité.

### AUTH_SECRET est obligatoire en production

Le secret de signature des sessions retombait sur une constante écrite dans le code, donc
publiée avec le dépôt : sans `AUTH_SECRET`, n'importe qui pouvait forger un jeton pour
n'importe quel compte. Le repli silencieux était le pire des cas — tout fonctionnait, et
rien ne signalait que la porte était ouverte. L'application **refuse désormais de signer
une session** en production sans un secret d'au moins 24 caractères.

```bash
openssl rand -base64 48    # valeur à poser dans AUTH_SECRET
```

### Une portée vide plutôt qu'une portée totale

La règle de visibilité des jeunes vivait dans les pages, en `if / else if` : un adjoint
**sans compagnie** ne tombait dans aucune branche, son filtre restait vide, et il voyait les
650 jeunes avec leurs renseignements médicaux. Or l'inscription permet de se déclarer
adjoint, et un adjoint fraîchement validé n'a pas encore de compagnie.

`src/lib/portee.ts` centralise la règle et la ferme par défaut : tout cas non prévu ne
montre rien plutôt que tout.

### Le mot de passe d'amorçage est un risque tant qu'il subsiste

Les comptes créés par l'amorçage partagent le même mot de passe initial, et les adresses se
déduisent des noms. Tant qu'une personne ne s'est pas connectée, quelqu'un qui devine son
adresse peut prendre son compte de vitesse et l'en exclure — le changement imposé à la
première connexion protège le compte, pas son propriétaire légitime.

Deux mesures : la page Administration **compte les comptes jamais ouverts** et dit quoi
faire ; et les tentatives de connexion sont limitées à **huit échecs par quart d'heure et
par adresse**. On ne verrouille pas le compte — verrouiller serait un moyen commode
d'empêcher quelqu'un de travailler le jour du départ.

### Sortir des pages d'avant-connexion

La connexion, la demande d'accès et le mot de passe oublié s'ouvrent souvent depuis un
lien reçu par message : on y arrive sans être passé par la présentation, et le navigateur
n'a même pas de page précédente où revenir. Chacune de ces quatre pages porte donc un
**retour à l'accueil**, et leur logo y mène aussi — c'est là qu'on le cherche. Sans cela,
la seule issue était de retaper l'adresse à la main.

## Préparation — le guide de planification

Le manuel de l'encadrant dit ce que chacun fait pendant les six jours ; l'application ne
portait que cela. Le **guide de planification** dit ce qui doit être prêt *avant*, et ce
que le site doit offrir. C'est ce qui sert maintenant : la conférence est reportée faute
de site, et tout le travail de préparation reprend.

`/preparation` (coordinateurs principaux et couple dirigeant) réunit quatre choses.

### Ce que le site doit offrir

Les exigences du guide, **chiffrées sur les effectifs réels**. C'est la différence entre
une liste et un outil : un gestionnaire de site sait répondre à « combien de douches ? »,
pas à « assez de douches ? ».

| Ratio du guide | Pour cette conférence |
|---|---|
| Un lit par personne | 719 couchages |
| Une toilette pour 16 femmes | 25 au minimum |
| Une toilette ou un urinoir pour 18 hommes | 18 au minimum |
| Une douche pour 12 personnes | 60 au minimum |
| 50 personnes par salle de classe | 15 salles |
| Un lieu de réunion par groupe | 72 lieux |
| Un lieu de rassemblement par compagnie | 36 lieux |

S'y ajoutent la salle où tout le monde s'assoit en même temps, la cafétéria, l'infirmerie,
l'espace d'enregistrement, le stockage, la buanderie, le parking, et les exigences
d'accessibilité. **Quinze sont marquées bloquantes** : sans elles la conférence ne peut pas
se tenir sur ce site — c'est ce qu'on regarde en premier pendant une visite.

Les chiffres se recalculent seuls : une inscription de plus, et la liste suit.

### Calendrier de préparation

Les jalons du guide qui relèvent de cette session — du site à réserver jusqu'au rapport
remis après la conférence — groupés par échéance, avec qui en répond. Chacun se coche, et
**se note** : « site réservé » et « site réservé, contrat en attente de signature » ne sont
pas la même chose, et c'est la seconde qu'on veut relire trois semaines plus tard. Qui a
coché et quand est enregistré.

La case bascule sans attendre le serveur : sur un réseau mobile, une case qui ne bouge pas
pendant une seconde se reclique, et le second clic annule le premier.

### Comité logistique

L'application ne connaissait que le comité de session — couple dirigeant, coordinateurs,
adjoints, conseillers. Le **comité logistique** existe pourtant, et c'est lui qu'on cherche
à joindre quand un repas manque ou qu'une chambre est inondée. Ses onze responsabilités
(installations, finances, repas, bien-être, hébergement, inclusion, matériel, publicité,
inscriptions, personnel encadrant, et l'administrateur de la logistique qui les coordonne)
se confient nominativement.

Le titulaire **n'a pas forcément de compte** : l'administrateur des repas peut être le
gestionnaire de la cafétéria du site. Un nom et un numéro suffisent — c'est souvent tout ce
qu'on a le jour où il faut appeler. Quand un compte est lié, le nom et le numéro en sont
tirés plutôt que redoublés : deux vérités possibles, c'est une de trop.

### Signaler un incident

Le Rapport mondial des incidents a **une entrée propre aux conférences FSY** — l'adresse
n'est pas celle des autres activités de l'Église, et c'est le genre de détail qu'on ne
cherche pas au moment où il faut signaler. Elle est donnée avec les quatre cas qui exigent
un rapport, et la règle du guide : *dans le doute, signalez*.

## Report de la conférence

La conférence a été reportée : le site qui devait accueillir les jeunes n'est pas
disponible. L'application le dit **partout**, et un seul fichier commande cet affichage —
`src/lib/report.ts`.

| Quand | Ce qu'il faut faire |
|---|---|
| La nouvelle date est connue | Renseigner `NOUVELLE_DATE`, redéployer. |
| La conférence est maintenue | Passer `REPORTEE` à `false`, redéployer. |

Le reste suit tout seul : le titre de l'onglet, l'accroche du site public, le message
signé, la barre en tête de chaque page de l'espace encadrant, l'annonce épinglée, les
avertissements du programme et des cars.

**Pourquoi dans le code et non en base.** Une annonce se crée depuis l'application, mais
elle ne s'affiche que sur la page des annonces, derrière la connexion. Or cette nouvelle
doit atteindre d'abord ceux qui n'ont pas de compte — les jeunes et leurs familles, qui
arrivent par le site public — et rester visible partout, sans dépendre de ce que
quelqu'un pense à consulter.

**Où elle apparaît :**

- **Site public** : le titre de l'onglet et la description (ils voyagent dans les aperçus
  de lien partagés sur WhatsApp — une page annonçant « du 3 au 8 août » se partagerait
  encore comme si de rien n'était), l'accroche à la place des dates, puis le message
  entier sous le hero.
- **Connexion et demande d'accès** : une ligne, avant même de se connecter. Beaucoup
  arrivent là par un lien reçu.
- **Espace encadrant** : une barre en tête de **chaque** page, posée dans le gabarit
  commun — rien de ce qui est affiché en dessous ne doit se lire sans le savoir.
- **Accueil et Annonces** : le message entier, signé. Sur les annonces il est épinglé en
  tête plutôt que mêlé aux autres : c'est celle qui conditionne toutes les autres, et elle
  ne doit pas glisser vers le bas à mesure qu'on en publie de nouvelles.
- **Programme** : les horaires restent ceux des manuels et seront repris à la nouvelle
  date, mais aucune activité n'a lieu aux dates initialement prévues.
- **Cars** : ne pointer aucune arrivée ni aucun départ. Les affectations sont conservées.

La signature est **lue en base** — les noms du couple dirigeant en fonction — et non
écrite en dur : un message d'excuses signé « la direction » n'engage personne, et une
signature figée deviendrait fausse si le couple changeait. La page publique s'affiche même
si la base ne répond pas ; elle retombe alors sur « Le couple dirigeant la conférence ».

## Page publique

`/` est une page de présentation accessible sans compte : thème de l'année, dates,
chiffres de la conférence, déroulé des six jours, organisation en groupes et compagnies,
présentation de l'application, informations pratiques (critères de participation,
encadrement, affaires à apporter, santé) et accès à l'espace des encadrants. Elle ne
publie que des chiffres agrégés : **aucun nom de participant**.

L'espace de travail commence à `/accueil`, derrière l'authentification.

## Modules

- **Accueil** — statistiques en direct, programme du jour (filtré par groupe pour les conseillers), dernières annonces, alertes de validations en attente.
- **Cars** — pointage des jeunes aux **trois étapes** : *départ du pieu* (montée dans le car au pieu ou district), *arrivée au site*, *retour le dernier jour* (montée dans le car le samedi 8 août). Recherche rapide par nom, horodatage de chaque validation, historique complet, alertes médicales et alimentaires affichées à côté du nom. **Le couple dirigeant et les coordinateurs principaux désignent, car par car et étape par étape, qui coche les noms** — un ou plusieurs conseillers, conseillères, coordinateurs ou coordinatrices. Les autres encadrants voient la liste en lecture seule. Tant que personne n'est désigné pour une étape, tout encadrant peut cocher : le jour même, personne ne doit être bloqué. La page Cars signale combien de pointages restent sans personne affectée.
- **Groupes** — réassignation dynamique : changer le conseiller d'un groupe, fusionner deux groupes, alerte de sur-capacité. Contrainte : groupe et conseiller du même sexe.
- **Jeunes** — 650 inscrits réels : recherche par nom/pieu/paroisse/groupe, âge, taille de t-shirt, statut d'inscription, badges 🎂 anniversaire, ⚕️ médical et 🍽 alimentaire, contact d'urgence ; filtres par onglet (anniversaires, à suivre, sans groupe) ; portée selon le rôle (conseiller → son groupe, adjoint → sa compagnie, coordinateur → tout) ; déplacement d'un jeune vers un autre groupe (coordinateurs).
- **Organigramme** — hiérarchie complète : couple dirigeant → coordinateurs principaux → compagnies (paires d'adjoints) → groupes (conseillers) → effectifs. Les numéros de téléphone du couple et des coordinateurs principaux sont cliquables pour appeler directement depuis le téléphone. Quelqu'un qui y figure deux fois a deux comptes : l'administration propose de les fusionner.
- **Pieux et districts** *(coordinateurs et adjoints)* — effectifs par unité, statuts d'inscription, **contrôle des critères d'âge officiels**, **conseillers à proposer** selon la formule officielle, **inscriptions approuvées en double** à faire vérifier, et profil attendu des conseillers.
- **Programme** — vue par jour (veille à J6) avec **tenues vestimentaires** et **rôle attendu de votre niveau** pour chaque activité, plages horaires (début → fin), création d'activités, public ciblé, confirmation des horaires provisoires, modification directe pour les coordinateurs, **propositions soumises à validation** pour les adjoints, annulation d'activités. Par défaut, chacun ne voit que ce qui le concerne.
- **Mon rapport** — rapport quotidien de chaque encadrant, une fois par journée de conférence. Voir la section dédiée ci-dessous.
- **Rapport final** *(coordinateurs principaux et couple dirigeant)* — synthèse automatique de tous les rapports quotidiens, exportable.
- **Santé et alimentation** *(couple dirigeant, coordinateurs principaux, adjoints au bien-être)* — tous les jeunes signalant un problème de santé ou une contrainte alimentaire.
- **Mon profil** — photo, téléphone, adresse e-mail et mot de passe. Accessible par son portrait dans l'en-tête.
- **Mon attestation** — progression vers la mention avant la clôture ; après la délivrance, le document imprimable, le code de vérification et la formulation de CV.
- **Attestations** *(couple dirigeant seul)* — délivrance en une fois, prévisions de mentions, avertissement sur les encadrants sans affectation, révocation, **spécimen** et **impression en lot** pour la cérémonie.
- **Annonces** — ciblées par rôle (tous, coordinateurs, adjoints, conseillers) et **programmables** : une annonce datée dans le futur reste invisible jusqu'à son échéance. Les 18 annonces d'anniversaire sont générées automatiquement.
- **Admin** — création de comptes, marquage présent/absent, octroi du droit de modification directe aux adjoints (couple dirigeant), **journal d'audit** (qui a fait quoi, quand).

## Matrice des permissions

| Action | Conseiller | Adjoint | Coordinateur | Dirigeant |
|---|:-:|:-:|:-:|:-:|
| Voir organigramme et programme | ✅ | ✅ | ✅ | ✅ |
| Voir les jeunes | Son groupe | Sa compagnie | Tous | Tous |
| Valider arrivées/départs aux cars | ✅ | ✅ | ✅ | ✅ |
| Voir l'historique des cars | — | Sa compagnie | Tout | Tout |
| Proposer une modification de programme | — | ✅ | (directe) | (directe) |
| Valider/rejeter les propositions | — | — | ✅ | ✅ |
| Réassigner jeunes/conseillers, fusionner | — | — | ✅ | ✅ |
| Créer annonces et activités | — | — | ✅ | ✅ |
| Créer des comptes | — | — | ✅ | ✅ |
| Recevoir une attestation | ✅ | ✅ | ✅ | — |
| Délivrer / révoquer les attestations | — | — | — | ✅ |
| Voir les alertes santé de tous les jeunes | — | Droit « Bien-être » | ✅ | ✅ |
| Verser le fichier d'inscription, corriger un renseignement | — | Droit « Bien-être » | ✅ | ✅ |
| Remettre le programme sur les rôles officiels | — | — | ✅ | ✅ |
| Préparation : site, calendrier, comité logistique | — | — | ✅ | ✅ |
| Changer l'appel d'un conseiller ou d'un adjoint | — | — | ✅ | ✅ |
| Rattacher une inscription à un compte existant | — | — | ✅ | ✅ |
| Fusionner deux comptes (conseiller, adjoint) | — | — | ✅ | ✅ |
| Fusionner deux comptes de coordinateur ou du couple | — | — | — | ✅ |
| Accorder les droits nominatifs | — | — | — | ✅ |
| Gérer permissions et présences, audit | — | — | — | ✅ |

Le couple dirigeant peut accorder à un adjoint le droit `MODIFICATION_DIRECTE`
(modification du programme sans validation) depuis la page Admin.

## Structure du code

```
prisma/schema.prisma       # modèle de données commenté
prisma/programme-fsy2026.ts # programme officiel (sources et arbitrages documentés)
prisma/participants.json   # 650 inscrits, champs non sensibles (versionné)
prisma/encadrement.json    # 62 encadrants : nom, rôle, sexe, unité (sans téléphone)
prisma/anniversaires.ts    # fenêtre du 2 au 8 août et génération des annonces J-2/J-1/jour J
src/lib/criteres.ts        # critères d'âge officiels, formule des conseillers, doublons probables
src/lib/perimetre.ts       # unités écartées du fichier d'inscription officiel
src/lib/theme.ts           # thème de l'année, partagé par l'application et l'amorçage
src/lib/remise-a-zero.ts   # ce que la remise à zéro d'après-essais peut effacer
src/middleware.ts          # recopie le chemin demandé, pour imposer le changement de mot de passe
vercel.json                # région fra1 : les fonctions au plus près de la base
public/logo-fsy-2026.png   # logo officiel, tel qu'il a été fourni, jamais redessiné (600×600, fond transparent)
src/lib/attestations.ts    # textes, mentions, compétences, code de vérification
src/components/Attestation.tsx # le document imprimable : A4 portrait, recto français / verso anglais
src/lib/etapes-car.ts      # les trois étapes de pointage aux cars
src/lib/rapports.ts        # questionnaire du rapport quotidien, barème de points, niveaux
src/lib/synthese.ts        # agrégation des rapports → rapport final et export Markdown
src/lib/cloudinary.ts      # photos de rapport : envoi signé, URL signées, suppression
src/lib/email.ts           # envoi par Resend, gabarits des messages, adresses d'attente
src/lib/rapprochement.ts   # proximité des noms : inscriptions ↔ comptes, et doublons entre comptes validés
src/components/Doublons.tsx # deux comptes pour une personne : choix du compte gardé, fusion
src/components/DecisionInscription.tsx # valider / refuser une inscription, refus des doublons
src/lib/vigilance.ts       # renseignements médicaux rangés par nature, et déclarations à clarifier
src/lib/guide.ts           # guide de planification : ratios du site, jalons, comité logistique, incidents
src/lib/report.ts          # report de la conférence : le seul fichier à modifier
src/components/Avatar.tsx  # portrait d'un encadrant, ou ses initiales colorées à défaut
prisma/seed.ts             # amorçage : participants, groupes, programme, annonces
src/lib/import-inscriptions.ts # lecture du fichier d'inscription, colonnes reconnues, rattachement aux jeunes
src/components/ImportInscriptions.tsx # versement depuis l'application : examen puis écriture
src/lib/renseignements.ts  # « RAS », « Néant » et les vingt façons de ne rien déclarer
scripts/importer-sensibles.ts # charge les données médicales et contacts des jeunes depuis data/ (voie hors ligne)
scripts/importer-contacts-encadrement.ts # charge les numéros des encadrants depuis data/
src/lib/roles.ts           # hiérarchie des rôles et règles de permission
src/lib/auth.ts            # sessions JWT (cookie httpOnly)
src/lib/actions.ts         # toutes les mutations (server actions) avec contrôle d'accès + audit
src/app/page.tsx           # page publique de présentation (aucune donnée personnelle)
src/app/(app)/…            # pages protégées (layout exige une session), à partir de /accueil
src/components/…           # composants interactifs (pointage car, rapport, recherche, programme…)
```

## Base de données

**PostgreSQL**, hébergé chez [Neon](https://neon.tech). Une seule variable
d'environnement est nécessaire :

| Variable | Rôle | Obligatoire |
|---|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL (Neon → projet → *Connection string*) | oui |
| `AUTH_SECRET` | Secret de signature des sessions — `openssl rand -base64 48` | oui |
| `CLOUDINARY_CLOUD_NAME` | Stockage des photos de rapport | non |
| `CLOUDINARY_API_KEY` | idem | non |
| `CLOUDINARY_API_SECRET` | idem — à ne mettre que dans les variables de l'hébergeur | non |
| `CLOUDINARY_PHOTOS_PUBLIQUES` | `1` pour servir les photos par lien libre au lieu d'une URL signée | non |

Sans les variables Cloudinary, les photos sont conservées dans la base : l'application
fonctionne, mais la page de synthèse devient lourde dès quelques centaines de photos.

Le schéma et les données sont installés **par le build** : la commande
`npm run build` enchaîne `prisma generate`, `prisma db push`, l'amorçage, puis
`next build`. Il n'y a donc aucune étape manuelle après avoir renseigné
`DATABASE_URL` — le premier déploiement crée les tables et charge les 650
participants, les 36 compagnies, les 8 cars, le programme et les annonces.

L'amorçage (`prisma/seed.ts`) est **rejouable** : il s'exécute à chaque
déploiement sans rien détruire. Tout y est soit un `upsert`, soit protégé par un
test « la table est-elle vide ? ». Les seules suppressions portent sur les
annonces d'anniversaire, régénérées aussitôt. Vérifié en conditions réelles :
après un second `db push` + amorçage, rapports quotidiens, pointages de cars,
affectations et activités créées à la main sont tous intacts.

`prisma db push` refuse les changements destructeurs sans `--accept-data-loss` :
une modification de schéma incompatible fait **échouer le déploiement** au lieu
de perdre des données.

Sur Vercel, chaque fonction serverless est un processus distinct.
`src/lib/db.ts` ajoute donc `connection_limit=1` à l'URL en environnement
Vercel, pour qu'une cinquantaine d'encadrants connectés simultanément n'épuisent
pas les connexions autorisées par la base.

### Développement local

```bash
cp .env.example .env        # renseigner DATABASE_URL et AUTH_SECRET
npm install
npm run setup               # client Prisma, schéma, données
npm run import:sensibles    # données médicales et contacts (data/, hors dépôt)
npm run dev                 # http://localhost:3000
```

N'importe quelle instance PostgreSQL convient — Neon, Supabase, ou un serveur
local (`postgresql://utilisateur@127.0.0.1:5432/fsy`).

## Mise en production

1. Renseigner `DATABASE_URL` et `AUTH_SECRET` dans les variables
   d'environnement de l'hébergeur (sur Vercel : *Settings → Environment
   Variables*, pour Production, Preview et Development).
2. Déployer. Le build installe le schéma et les données tout seul.
3. Charger les données sensibles des participants avec `npm run import:sensibles`
   depuis une machine ayant accès à la base (le fichier source n'est pas
   versionné, et le déploiement ne le contient donc pas).
4. **Toutes les données sont réelles** : le programme, les 650 participants et les
   66 comptes d'encadrement. Il reste à décider, dans l'application, quel conseiller
   encadre quel groupe et quel adjoint dirige quelle compagnie.
