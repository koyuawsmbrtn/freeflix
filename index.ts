import * as readline from "node:readline";
import { stdin as input, stdout as output } from "process";
import { search, defaultProviders } from "torrent-browse";
import inquirer from "inquirer";
import { $ } from "bun";

const rl = readline.createInterface({ input, output });
await $`rm -rf /tmp/torrent-stream/`

rl.question("Search movies or episodes: ", (searchQuery: string) => {
    search(defaultProviders, searchQuery)
        .then(async result => {
            const choices = result.items
                .filter(item => item.data.peers > 2)
                .map(item => ({ name: item.data.name, value: item }));

            if (choices.length == 0) {
                console.error("No available torrents found :(");
                return;
            }

            const answer = await inquirer.prompt([
                {
                    type: "list",
                    name: "selectedItem",
                    message: "Select an item:",
                    choices: choices
                }
            ]);

            console.log(answer.selectedItem.data);

            fetch(answer.selectedItem.data.link).then(response => response.text()).then(async html => {
                let magnetMatch = html.match(/href="(magnet:[^"]+)"/)?.toString().replace("href=\"", "").split("\"")[0];
                if (!magnetMatch || magnetMatch === "") {
                    magnetMatch = answer.selectedItem.data.magnet;
                }
                await $`gnome-terminal -e "peerflix ${magnetMatch} --mpv"`
            });
        })
        .catch(error => console.error(error))
        .finally(() => rl.close());
});