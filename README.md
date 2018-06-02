# @ifct2017/descriptions

[![IFCT2017](http://ninindia.org/images/ifct_2017.png)](http://ninindia.org/ifct_2017.htm)

Food descriptions in [Indian Food Composition Tables 2017].<br>
Check available [food descriptions].
> Large corpus is not loaded synchronously.<br>
> Load it asynchronously with **.load()**.

```javascript
const descriptions = require('@ifct2017/descriptions');
// descriptions(<query>)
// -> [{code, name, scie, desc}] for matched foods
// descriptions.corpus: Map {code => {code, name, scie, desc}}
// descriptions.load(): load corpus (returns promise)
// descriptions.sql([table], [options]): Promise (sql commands)
// descriptions.csv(): path to csv file

await descriptions.load();
/* load corpus first */

descriptions('pineapple');
descriptions('ananas comosus');
// [ { code: 'E053',
//     name: 'Pineapple',
//     scie: 'Ananas comosus',
//     desc: 'A. Ahnaros; B. Anarasa; G. Anenas; H. Ananas; Kan. Ananas; Kash. Punchitipul; Kh. Soh trun; Kon. Anas; Mal. Kayirha chakka; M. Kihom Ananas; O. Sapuri; P. Ananas; Tam. Annasi pazham; Tel. Anasa pandu; U. Ananas.' } ]

descriptions('tell me about cow milk.');
descriptions('gai ka doodh details.');
// [ { code: 'L002',
//     name: 'Milk, Cow',
//     scie: '',
//     desc: 'A. Garoor gakhir; B. Doodh (garu); G. Gai nu dhudh; H. Gai ka doodh; Kan. Hasuvina halu; Kash. Doodh; Kh. Dud masi; M. San Sanghom; Mar. Doodh (gay); O. Gai dudha; P. Gaan da doodh; S. Gow kshiram; Tam. Pasumpaal; Tel. Aavu paalu.' } ]
```


[Indian Food Composition Tables 2017]: http://ifct2017.com/
[food descriptions]: https://github.com/ifct2017/descriptions/blob/master/index.csv
