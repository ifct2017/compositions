Detailed [nutrient composition] of 528 key foods in India.
> This is part of package [ifct2017].<br>
> Source: [Indian Food Composition Tables 2017].

```javascript
const compositions = require('@ifct2017/compositions');
// compositions.corpus: Map {code => {code, name, scie, lang, grup, regn, tags, ...}}
// compositions.load(): Promise (corpus loaded)
// compositions.sql([table], [options]): Promise (sql commands)
// compositions.csv(): path to csv file
// compositions(<query>)
// -> [{code, name, scie, lang, grup, regn, tags, ...}] for matched foods


await compositions.load();
/* load corpus first */

compositions('pineapple');
compositions('ananas comosus');
// [ { code: 'E053',
//     name: 'Pineapple',
//     scie: 'Ananas comosus',
//     lang: 'A. Ahnaros; B. Anarasa; G. Anenas; H. Ananas; Kan. Ananas; Kash. Punchitipul; Kh. Soh trun; Kon. Anas; Mal. Kayirha chakka; M. Kihom Ananas; O. Sapuri; P. Ananas; Tam. Annasi pazham; Tel. Anasa pandu; U. Ananas.',
//     ... } ]

compositions('tell me about cow milk.');
compositions('gai ka doodh details.');
// [ { code: 'L002',
//     name: 'Milk, Cow',
//     scie: '',
//     lang: 'A. Garoor gakhir; B. Doodh (garu); G. Gai nu dhudh; H. Gai ka doodh; Kan. Hasuvina halu; Kash. Doodh; Kh. Dud masi; M. San Sanghom; Mar. Doodh (gay); O. Gai dudha; P. Gaan da doodh; S. Gow kshiram; Tam. Pasumpaal; Tel. Aavu paalu.',
//     ... } ]
```


[![ifct2017](http://ifct2017.com/ifct_2017.jpg)](https://www.npmjs.com/package/ifct2017)
> You can ask about composition of 528 key foods in India here: [ifct2017.github.io].<br>
> Food composition values were measured by [National Institute of Nutrition, Hyderabad].<br>
> Take a peek at the raw data here: [Document], [Webpage], [Tables document], [Tables webpage].

[ifct2017]: https://www.npmjs.com/package/ifct2017
[Indian Food Composition Tables 2017]: http://ifct2017.com/
[nutrient composition]: https://github.com/ifct2017/compositions/blob/master/index.csv
[ifct2017.github.io]: https://ifct2017.github.io
[National Institute of Nutrition, Hyderabad]: https://www.nin.res.in/
[Document]: https://docs.google.com/spreadsheets/d/19C2EB4PIMgyusqKOnBq4-aBQxLjCai1Zg45YcBNTzFo/edit?usp=sharing
[Webpage]: https://docs.google.com/spreadsheets/d/e/2PACX-1vRAWAh3wLrPjDfeZ2pmApbwnvJ11CxdWaPiJ4BPClyN9X1wbbCjvfyqYpBy-LoIBltsH7MKjtNATtAh/pubhtml
[Tables document]: https://docs.google.com/spreadsheets/d/1ejgqo6uwlKRF3QLUPJJzrTkd47GtVXgHHsgG-T27uGc/edit?usp=sharing
[Tables webpage]: https://docs.google.com/spreadsheets/d/e/2PACX-1vTNaOhfRaF_DxH5yh4QtW2D3iJSM4MRIKB-P_cFRlHGhEzWo5NP5ADmAzrpXH2fsjmzJEOMbmaBFMgq/pubhtml
