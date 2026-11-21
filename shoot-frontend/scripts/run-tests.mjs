import {spawnSync} from 'node:child_process';
const runs=[
 ['--test','tests/catalog.test.mjs','tests/navigation.test.mjs','tests/reference-api.test.mjs','tests/favicon.test.mjs','tests/recaptcha.test.mjs','tests/verification-api.test.mjs'],
 ['node_modules/vitest/vitest.mjs','run','src/lib/api.test.js'],
];
for(const args of runs){
 const result=spawnSync(process.execPath,args,{stdio:'inherit',shell:false});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
