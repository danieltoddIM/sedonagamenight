/* Focused unit tests. These do not replace the live database/Next/SMS smoke tests. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true }
  });
  module._compile(outputText, filename);
};
const root = path.resolve(__dirname, '..');
const { normalizeUsPhone, formatPhone } = require(path.join(root, 'lib/phone.ts'));
const { arizonaInstant, formatTime, formatLong, formatShort, suggestedDates, googleCalendarUrl } = require(path.join(root, 'lib/dates.ts'));
const { signSession, validSession, equal } = require(path.join(root, 'lib/session.ts'));
const { pizzaOrder } = require(path.join(root, 'lib/pizza.ts'));
const { featuredGames } = require(path.join(root, 'lib/featured.ts'));
const group = (extra = {}) => ({ adults: 1, kids: 0, gluten_free: 0, pizza: null, ...extra });

test('US number normalization accepts formatted ten digits', () => assert.equal(normalizeUsPhone('(928) 555-1234'), '+19285551234'));
test('US number normalization accepts +1 prefix', () => assert.equal(normalizeUsPhone('+1 928 555 1234'), '+19285551234'));
test('rejects too few digits', () => assert.equal(normalizeUsPhone('123'), null));
test('rejects non-US length', () => assert.equal(normalizeUsPhone('+44 20 7123 4567'), null));
test('rejects area code beginning with zero', () => assert.equal(normalizeUsPhone('0285551234'), null));
test('phone display is readable', () => assert.equal(formatPhone('+19285551234'), '(928) 555-1234'));
test('Arizona summer time remains UTC-7', () => assert.equal(arizonaInstant('2027-07-15', '18:30').toISOString(), '2027-07-16T01:30:00.000Z'));
test('Arizona winter time remains UTC-7', () => assert.equal(arizonaInstant('2027-01-15', '18:30').toISOString(), '2027-01-16T01:30:00.000Z'));
test('12-hour midnight formatting', () => assert.equal(formatTime('00:05'), '12:05 AM'));
test('12-hour noon formatting', () => assert.equal(formatTime('12:00'), '12:00 PM'));
test('date labels preserve local calendar day', () => assert.equal(formatLong('2026-10-15'), 'Thursday, October 15'));
test('compact date parts are correct', () => assert.deepEqual(formatShort('2026-10-15'), {month:'Oct',day:15,weekday:'Thursday'}));
test('suggested nights use the configured third Thursday', () => assert.deepEqual(suggestedDates(3, '2026-10-13'), ['2026-10-15','2026-11-19','2026-12-17']));
test('suggested nights exclude the supplied date and cross years', () => assert.deepEqual(suggestedDates(2, '2026-12-17'), ['2027-01-21','2027-02-18']));
test('calendar link uses real UTC instants', () => assert.equal(new URL(googleCalendarUrl('2026-10-15','18:30','21:00')).searchParams.get('dates'), '20261016T013000Z/20261016T040000Z'));
test('signed organizer session is valid before expiry', () => { const s=signSession('test-secret', 100000); assert.equal(validSession(s, 'test-secret', 100001), true); });
test('signed organizer session expires after seven days', () => { const s=signSession('test-secret', 100000); assert.equal(validSession(s, 'test-secret', 100000+7*86400000), false); });
test('session rejects the wrong secret', () => assert.equal(validSession(signSession('one'), 'two'), false));
test('session rejects a modified signature', () => { const s=signSession('test'); assert.equal(validSession(s+'x','test'),false); });
test('session rejects malformed tokens without throwing', () => { for(const s of ['','.', 'a.b.c','not-a-session']) assert.equal(validSession(s,'test'),false); });
test('session nonces prevent identical tokens', () => assert.notEqual(signSession('test',1000),signSession('test',1000)));
test('constant-time equality handles different lengths', () => { assert.equal(equal('a','ab'),false); assert.equal(equal('same','same'),true); });
test('no RSVPs means no pizza', () => { const p=pizzaOrder([]); assert.equal(p.people,0); assert.equal(p.larges,0); assert.equal(p.glutenFreePizzas,0); });
test('adults and children contribute different slice estimates', () => { const p=pizzaOrder([group({adults:2,kids:2,pizza:'Cheese'})]); assert.equal(p.people,4); assert.equal(p.slices,10); assert.equal(p.larges,2); });
test('gluten-free guests are excluded from regular slice estimate', () => { const p=pizzaOrder([group({adults:2,kids:1,gluten_free:1})]); assert.equal(p.slices,5); assert.equal(p.glutenFreePeople,1); assert.equal(p.glutenFreePizzas,1); });
test('all-gluten-free group has no regular pizzas', () => { const p=pizzaOrder([group({adults:2,gluten_free:2})]); assert.equal(p.larges,0); assert.equal(p.glutenFreePizzas,1); });
test('topping allocation always adds up to the regular pizza total', () => { for(let n=1;n<40;n++){const p=pizzaOrder([group({adults:n,pizza:'Cheese,Pepperoni'}),group({adults:3,kids:2})]);assert.equal(p.byType.reduce((s,t)=>s+t.count,0),p.larges);} });
test('unknown toppings safely fall back to familiar choices', () => { const p=pizzaOrder([group({adults:4,pizza:'Not an option'})]); assert.equal(p.byType.reduce((s,t)=>s+t.count,0),2); });
test('the homepage uses the seven selected games', () => assert.deepEqual(featuredGames.map(g=>g.name),['Rummikub','Scrabble','Yahtzee','Skip-Bo','Sorry!','The Game of Life','Clue']));
test('excluded games are not in the featured lineup', () => assert.equal(featuredGames.some(g=>/mahjong|bridge/i.test(g.name)),false));
