# freeflix

## How does this work?

This is a TypeScript script. It scrapes 1337x and other sites and gets the magnet link.
After this it uses [peerflix](https://github.com/mafintosh/peerflix) to stream the video from the magnet link.

## Dependencies

* bun
* gnome-terminal or any other supported Terminal
* peerflix
* Mullvad if you automatically want to be connected with a VPN (can be disabled with --no-mullvad)

## License
This project is licensed under [GPL-3.0](https://raw.githubusercontent.com/Illumina/licenses/master/gpl-3.0.txt).