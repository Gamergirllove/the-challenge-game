'use strict';

const BANNED = [
  'fuck','shit','bitch','cunt','nigger','nigga','faggot','fag','asshole','bastard',
  'dick','cock','pussy','whore','slut','piss','ass','arse','damn','crap',
  'motherfucker','fucker','bullshit','horseshit','jackass','douchebag','douche',
  'retard','retarded','twat','wanker','prick','jerk','idiot',
  'kike','spic','chink','gook','wetback','tranny',
];

// Build regex: matches word with common leet substitutions (a→@4, i→1, e→3, o→0, s→5)
function toPattern(w) {
  return w
    .replace(/a/gi, '[a@4]')
    .replace(/i/gi, '[i1!]')
    .replace(/e/gi, '[e3]')
    .replace(/o/gi, '[o0]')
    .replace(/s/gi, '[s$5]')
    .replace(/u/gi, '[uü]');
}

const REGEXES = BANNED.map(w => new RegExp(`\\b${toPattern(w)}s?\\b`, 'gi'));

function containsProfanity(str) {
  return REGEXES.some(r => { r.lastIndex = 0; return r.test(str); });
}

function filterChat(str) {
  let out = str;
  REGEXES.forEach(r => {
    r.lastIndex = 0;
    out = out.replace(r, m => '*'.repeat(m.length));
  });
  return out;
}

module.exports = { containsProfanity, filterChat };
