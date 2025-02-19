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

            fetch(answer.selectedItem.data.link).then(response => response.text()).then(async html => {
                let magnetMatch = html.match(/href="(magnet:[^"]+)"/)?.toString().replace("href=\"", "").split("\"")[0];
                if (!magnetMatch || magnetMatch === "") {
                    magnetMatch = answer.selectedItem.data.magnet;
                }
                const players = process.platform === 'win32' ? ['mpv.exe', 'vlc.exe'] 
                    : process.platform === 'darwin' ? ['mpv', 'vlc'] 
                    : ['mpv', 'vlc'];
                const terminals = process.platform === 'win32' 
                    ? ['cmd.exe']
                    : process.platform === 'darwin'
                    ? ['Terminal.app', 'iTerm.app']
                    : ['kgx', 'gnome-terminal', 'xterm', 'konsole', 'terminal'];

                let player = players.find(async p => (await $`which ${p}`.quiet()).exitCode === 0) || 'mpv';

                let terminal = terminals.find(async t => (await $`which ${t}`.quiet()).exitCode === 0) || 
                    (process.platform === 'win32' ? 'cmd.exe' : 
                     process.platform === 'darwin' ? 'Terminal.app' : 'xterm');
                
                if (process.platform === 'win32') {
                    await $`${terminal} /c "peerflix ${magnetMatch} --${player}"`;
                } else if (process.platform === 'darwin') {
                    await $`open -a ${terminal} peerflix ${magnetMatch} --${player}`;
                } else {
                    await $`${terminal} -e "peerflix ${magnetMatch} --${player}"`;
                }
            });
        })
        .catch(error => console.error(error))
        .finally(() => rl.close());
});