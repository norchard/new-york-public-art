m h  dom mon dow   command

0 4 * * Mon echo "never graduate " >> dontdoit.txt

aws s3 rm s3://publicartin.nyc/data/*
curl -o DPR_PublicArt.json https://www.nycgovparks.org/bigapps/DPR_PublicArt_001.json
aws s3 mv DPR_PublicArt.json s3://publicartin.nyc/data/
rm DPR_PublicArt.json
