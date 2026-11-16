set -e
cd /home/user/rebrand
npx vite build --ssr .cache/ui/${T:-tests}.jsx --outDir .cache/ui/out --emptyOutDir true --logLevel error
for r in manager admin; do ROLE=$r MOD=/home/user/rebrand/.cache/ui/out/${T:-tests}.js node .cache/ui/run.mjs; done
