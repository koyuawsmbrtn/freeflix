/**
 * FreeFlix - A command-line torrent streaming application
 * 
 * This program allows users to search and stream movies/TV shows from torrent sources
 * directly to their media player of choice (MPV or VLC).
 * 
 * @copyright Copyright (C) 2025
 * @license GNU General Public License v3.0
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * Features:
 * - Integrated Mullvad VPN support
 * - Cross-platform support (Windows, macOS, Linux)
 * - Multiple media player support (MPV, VLC)
 * - Automatic terminal detection
 * - Peer filtering (minimum 2 peers required)
 * 
 * Dependencies:
 * - readline: For command line interface
 * - torrent-browse: For searching torrents
 * - inquirer: For interactive selection
 * - bun: For process execution
 * - peerflix: For torrent streaming (external dependency)
 * - Mullvad VPN (optional)
 * 
 * Command line options:
 * --no-mullvad: Skip Mullvad VPN connection check
 * 
 * @requires node:readline
 * @requires process
 * @requires torrent-browse
 * @requires inquirer
 * @requires bun
 */

import * as readline from "node:readline";
import { stdin as input, stdout as output } from "process";
import { search, defaultProviders } from "torrent-browse";
import inquirer from "inquirer";
import { $ } from "bun";

const rl = readline.createInterface({ input, output });
await $`rm -rf /tmp/torrent-stream/`;

if (!process.argv.includes("--no-mullvad")) {
    try {
        await $`mullvad connect && sleep 1`.quiet();
        console.log("Mullvad enabled!");
    } catch (error) {
        console.error("Mullvad not found, skipping...");
    }
}

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
