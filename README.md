# testInsta

try to post on instagram using https://github.com/dilame/instagram-private-api

[reference issue](https://github.com/dilame/instagram-private-api/issues/1637#issuecomment-1194940480)

## HowTo
### setup
````bash
git clone https://github.com/boly38/testInsta.git
cd testInsta
npm install
````

### usage
````bash
export IG_USERNAME=toto
export IG_PASSWORD=tataboumX
node myTest help
node myTest home
unset IG_USERNAME IG_PASSWORD

# alternative to export
IG_USERNAME=toto IG_PASSWORD=tataboumX node myTest home
````