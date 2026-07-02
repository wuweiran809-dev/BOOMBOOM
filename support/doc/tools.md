# CLI tools guide

[[toc]]

## Remote BoomBoom CLI

`boomboom-cli` is a tool that communicates with a BoomBoom instance using its [REST API](https://docs.joinboomboom.org/api-rest-reference.html).
It can be launched from a remote server/computer to easily upload videos, manage plugins, redundancies etc.

### Installation

Ensure you have `node` installed on your system:

```bash
node --version # Should be >= 22.x
```

Then install the CLI:

```bash
sudo npm install -g @boomboom/boomboom-cli
```

### CLI wrapper

The wrapper provides a convenient interface to the following sub-commands.

```
Usage: boomboom-cli [command] [options]

Options:
  -v, --version                     output the version number
  -h, --help                        display help for command

Commands:
  auth                              Register your accounts on remote instances to use them with other commands
  upload|up [options]               Upload a video on a BoomBoom instance
  redundancy|r                      Manage instance redundancies
  plugins|p                         Manage instance plugins/themes
  get-access-token|token [options]  Get a boomboom access token
  help [command]                    display help for command
```

The wrapper can keep track of instances you have an account on. We limit to one account per instance for now.

```bash
boomboom-cli auth add -u 'BOOMBOOM_URL' -U 'BOOMBOOM_USER' --password 'BOOMBOOM_PASSWORD'
```

Now list the account(s) you've created

```bash
boomboom-cli auth list
```

```
┌──────────────────────────────┬──────────────────────────────┐
│ instance                     │ login                        │
├──────────────────────────────┼──────────────────────────────┤
│ 'BOOMBOOM_URL'               │ 'BOOMBOOM_USER'              │
└──────────────────────────────┴──────────────────────────────┘
```

You can now use that account to execute sub-commands without feeding the `--url`, `--username` and `--password` parameters:

```bash
boomboom-cli upload <videoFile>
```

```bash
boomboom-cli plugins list
...

```

#### boomboom-cli upload

You can use this script to upload videos directly from the CLI.

Videos will be publicly available after transcoding (you can see them before that in your account on the web interface).

```bash
cd ${CLONE}
boomboom-cli upload --help
```

#### boomboom-cli plugins

Install/update/uninstall or list local or NPM BoomBoom plugins:

```bash
cd ${CLONE}
boomboom-cli plugins --help
boomboom-cli plugins list --help
boomboom-cli plugins install --help
boomboom-cli plugins update --help
boomboom-cli plugins uninstall --help

boomboom-cli plugins install --path /my/plugin/path
boomboom-cli plugins install --npm-name boomboom-theme-example
```

#### boomboom-cli redundancy

Manage (list/add/remove) video redundancies:

To list your videos that are duplicated by remote instances:

```bash
boomboom-cli redundancy list-remote-redundancies
```

To list remote videos that your instance duplicated:

```bash
boomboom-cli redundancy list-my-redundancies
```

To duplicate a specific video in your redundancy system:

```bash
boomboom-cli redundancy add --video 823
```

To remove a video redundancy:

```bash
boomboom-cli redundancy remove --video 823
```


## BoomBoom runner

BoomBoom supports VOD/Live transcoding and VOD transcription (BoomBoom >= 6.2) by a remote BoomBoom runner.

The runner communicates with the BoomBoom instance using HTTP and WebSocket and doesn't need to have a public IP.
So you can run a runner on a classic server, a non-public server or even on your own computer!

You can read the admin documentation on how to use BoomBoom runners on https://docs.joinboomboom.org/admin/remote-runners

### Runner installation

Ensure you have `node`, `ffmpeg` and `ffprobe` installed on your system:

```bash
node --version # Should be >= 22.x
ffprobe -version # Should be >= 4.3
ffmpeg -version # Should be >= 4.3
```

If you want to use video transcription:

```bash
pip install whisper-ctranslate2 # or pipx install whisper-ctranslate2 depending on your distribution
```

Then install the CLI:

```bash
sudo npm install -g @boomboom/boomboom-runner
```

### Configuration

The runner uses env paths like `~/.config`, `~/.cache` and `~/.local/share` directories to store runner configuration or temporary files.

Multiple BoomBoom runners can run on the same OS by using the `--id` CLI option (each runner uses its own config/tmp directories):

```bash
boomboom-runner [commands] --id instance-1
boomboom-runner [commands] --id instance-2
boomboom-runner [commands] --id instance-3
```

You can change the runner configuration (jobs concurrency, ffmpeg threads/nice, whisper engines/models, etc.) by editing `~/.config/boomboom-runner-nodejs/[id]/config.toml`.

The runner TOML config template consists of:

```toml
[jobs]
# How much concurrent jobs the runner can execute in parallel
concurrency = 2

[ffmpeg]
# How much threads a ffmpeg process can use
# 0 -> let ffmpeg automatically choose
threads = 0
nice = 20

[transcription]
# Choose between "openai-whisper" or "whisper-ctranslate2"
# Engine binary has to be installed manually (unlike the BoomBoom instance that can install whisper automatically)
engine = "whisper-ctranslate2"
# Optional whisper binary path if not available in global path
enginePath = "/var/prunner/.local/pipx/venvs/whisper-ctranslate2/bin/whisper-ctranslate2"
# Whisper model: "tiny", "base", "small", "medium", "large-v2" or "large-v3"
model = "large-v2"

# Registered instances are saved in the config file
[[registeredInstances]]
url = "..." # URL of the instance
runnerToken = "..." # Shared runner token secret
runnerName = "..." # Runner name declared to the BoomBoom instance

[[registeredInstances]]
url = "..."
runnerToken = "..."
runnerName = "..."
```

### Run the server

#### In a shell

You need to run the runner in server mode first so it can run transcoding jobs of registered BoomBoom instances:

```bash
boomboom-runner server
```

You can also decide which kind of job the runner can execute with `--enable-job <type>` option.
This way you can have one dedicated runner for transcription tasks (on a GPU machine for example) and another one for transcoding tasks.

Only transcription tasks

```bash
boomboom-runner server --enable-job video-transcription
```

Only VOD transcoding tasks

```bash
boomboom-runner server --enable-job vod-web-video-transcoding --enable-job vod-hls-transcoding --enable-job vod-audio-merge-transcoding
```

Only "studio" transcoding

```bash
boomboom-runner server --enable-job video-studio-transcoding
```

Only "live" transcoding

```bash
boomboom-runner server --enable-job live-rtmp-hls-transcoding
```

#### As a Systemd service

If your OS uses systemd, you can also configure a service so that the runner starts automatically.

To do so, first create a dedicated user. Here, we are calling it `prunner`, but you can choose whatever name you want.
We are using `/srv/prunner` as his home dir, but you can choose any other path.

```bash
useradd -m -d /srv/prunner -s /usr/sbin/nologin prunner
```

::: info Note
If you want to use `/home/prunner`, you have to set `ProtectHome=false` in the systemd configuration (see below).
:::

Now, you can create the `/etc/systemd/system/prunner.service` file (don't forget to adapt path and user/group names if you changed it):

```Systemd
[Unit]
Description=BoomBoom runner daemon
After=network.target

[Service]
Type=simple
Environment=NODE_ENV=production
User=prunner
Group=prunner
ExecStart=boomboom-runner server
WorkingDirectory=/srv/prunner
SyslogIdentifier=prunner
Restart=always

; Some security directives.
; Mount /usr, /boot, and /etc as read-only for processes invoked by this service.
ProtectSystem=full
; Sets up a new /dev mount for the process and only adds API pseudo devices
; like /dev/null, /dev/zero or /dev/random but not physical devices. Disabled
; by default because it may not work on devices like the Raspberry Pi.
PrivateDevices=false
; Ensures that the service process and all its children can never gain new
; privileges through execve().
NoNewPrivileges=true
; This makes /home, /root, and /run/user inaccessible and empty for processes invoked
; by this unit. Make sure that you do not depend on data inside these folders.
ProtectHome=true
; Drops the sys admin capability from the daemon.
CapabilityBoundingSet=~CAP_SYS_ADMIN

[Install]
WantedBy=multi-user.target
```

:::info Note
You can add the parameter `--id instance-1` on the `ExecStart` line, if you want to have multiple instances.
You can then create multiple separate services. They can use the same user and path.
:::

Finally, to enable the service for the first time:

```bash
systemctl daemon-reload
systemctl enable prunner.service
systemctl restart prunner.service
```

Next time, if you need to start/stop/restart the service:

```bash
systemctl stop prunner.service
systemctl start prunner.service
systemctl restart prunner.service
```

You can also check the status (and last logs):

```bash
systemctl status prunner.service
```

To edit the runner configuration: juste edit the `/srv/prunner/.config/boomboom-runner-nodejs/default/config.toml` file,
and restart the service (this file will be created when the runner starts for the first time).

If you are using the `--id` parameter, you can change specific configuration by editing the file `/srv/prunner/.config/boomboom-runner-nodejs/[id]/config.toml`.

::: info
For every boomboom-runner commands described below, you have to run them as the `prunner` user.
So for example, to call the `list-registered` command: `sudo -u prunner boomboom-runner list-registered`.
Otherwise the script will read the wrong configuration and cache files, and won't work as expected.
:::

### Register

Then, you can register the runner to process transcoding job of a remote BoomBoom instance:

::: code-group

```bash [Shell]
boomboom-runner register --url http://boomboom.example.com --registration-token ptrrt-... --runner-name my-runner-name
```

```bash [Systemd]
sudo -u prunner boomboom-runner register --url http://boomboom.example.com --registration-token ptrrt-... --runner-name my-runner-name
```

:::

The runner will then use a websocket connection with the BoomBoom instance to be notified about new available transcoding jobs.

### Unregister

To unregister a BoomBoom instance:

::: code-group


```bash [Shell]
boomboom-runner unregister --url http://boomboom.example.com --runner-name my-runner-name
```

```bash [Systemd]
sudo -u prunner boomboom-runner unregister --url http://boomboom.example.com --runner-name my-runner-name
```

:::

### List registered instances

::: code-group

```bash [Shell]
boomboom-runner list-registered
```

```bash [Systemd]
sudo -u prunner boomboom-runner list-registered
```

:::

### List jobs

**Runner >= 0.1.0**

To list jobs that are processed by the runner:

::: code-group

```bash [Shell]
boomboom-runner list-jobs
boomboom-runner list-jobs --include-payload
```

```bash [Systemd]
sudo -u prunner boomboom-runner list-jobs
sudo -u prunner boomboom-runner list-jobs --include-payload
```

:::

### Graceful shutdown

Ask the runner to shutdown when it has finished all of its current tasks:

::: code-group

```bash [Shell]
boomboom-runner graceful-shutdown
```

```bash [Systemd]
sudo -u prunner boomboom-runner graceful-shutdown
```

:::

### Update the runner package

You can check if there is a new runner version using:

```bash
sudo npm outdated -g @boomboom/boomboom-runner
```

```
Package                    Current  Wanted  Latest  Location                                Depended by
@boomboom/boomboom-runner    0.0.6   0.0.7   0.0.7  node_modules/@boomboom/boomboom-runner  lib
```

To update the runner:

Update the package
```bash
sudo npm update -g @boomboom/boomboom-runner
```

Check that the version changed (optional)
```bash
sudo npm list -g @boomboom/boomboom-runner
```

Restart the service (if you are using systemd)
```bash
sudo systemctl restart prunner.service
```

## Server tools

Server tools are scripts that interact directly with the code of your BoomBoom instance.
They must be run on the server, in `boomboom-latest` directory.

### Parse logs

To parse BoomBoom last log file:

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run parse-log -- --level info
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run parse-log -- --level info
```

:::

`--level` is optional and could be `info`/`warn`/`error`

You can also remove SQL or HTTP logs using `--not-tags`:

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run parse-log -- --level debug --not-tags http sql
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run parse-log -- --level debug --not-tags http sql
```

:::

### Regenerate video and playlist thumbnails

Regenerating local video and playlist thumbnails could be useful because new BoomBoom releases may increase thumbnail sizes:

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run regenerate-thumbnails
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run regenerate-thumbnails
```

:::

### Add or replace specific video file

You can use this script to import a video file to replace an already uploaded file or to add a new web compatible resolution to a video. BoomBoom needs to be running.
You can then create a transcoding job using the web interface if you need to optimize your file or create an HLS version of it.

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run create-import-video-file-job -- -v [videoUUID] -i [videoFile]
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run create-import-video-file-job -- -v [videoUUID] -i [videoFile]
```

:::

### Move video files from filesystem to object storage

Use this script to move video related files (video files, original video file, captions, etc.) to object storage.

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run create-move-video-storage-job -- --to-object-storage -v [videoUUID]
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run create-move-video-storage-job -- --to-object-storage -v [videoUUID]
```

:::

The script can also move all video related files that are not already in object storage:

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run create-move-video-storage-job -- --to-object-storage --all-videos
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run create-move-video-storage-job -- --to-object-storage --all-videos
```

:::

### Move video files from object storage to filesystem

**BoomBoom >= 6.0**

Use this script to move video related files (video files, original video file, captions, etc.) from object storage to the BoomBoom instance filesystem.

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run create-move-video-storage-job -- --to-file-system -v [videoUUID]
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run create-move-video-storage-job -- --to-file-system -v [videoUUID]
```

:::

The script can also move all video related files that are not already on the filesystem:

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run create-move-video-storage-job -- --to-file-system --all-videos
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run create-move-video-storage-job -- --to-file-system --all-videos
```

:::

### Cleanup remote files

**BoomBoom >= 6.2**

Use this script to recover disk space by removing remote files (thumbnails, avatars...) that can be re-fetched later by your BoomBoom instance on-demand.

Restart BoomBoom after running this script.

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run house-keeping -- --delete-remote-files
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run house-keeping -- --delete-remote-files
```

:::


### Generate storyboard

**BoomBoom >= 6.0**

Use this script to generate storyboard of a specific video:

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run create-generate-storyboard-job -- -v [videoUUID]
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run create-generate-storyboard-job -- -v [videoUUID]
```

:::

The script can also generate all missing storyboards of local videos:

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run create-generate-storyboard-job -- --all-videos
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run create-generate-storyboard-job -- --all-videos
```

:::

### Prune filesystem/object storage

Some transcoded videos or shutdown at a bad time can leave some unused files on your storage.
To delete these files (a confirmation will be demanded first):

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run prune-storage
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run prune-storage
```

:::

It's also possible to remove more local files if your stop BoomBoom using the `--offline` option:

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run prune-storage -- --offline
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run prune-storage -- --offline
```

:::

### Update BoomBoom instance domain name

**Changing the hostname is unsupported and may be a risky operation, especially if you have already federated.**
If you started BoomBoom with a domain, and then changed it you will have
invalid torrent files and invalid URLs in your database. To fix this, you have
to run the command below (keep in mind your follower instances will NOT update their URLs).

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run update-host
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run update-host
```

:::

### Reset user password

To reset a user password from CLI, run:

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run reset-password -- -u target_username
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run reset-password -- -u target_username
```

:::


### Install or uninstall plugins

The difference with `boomboom plugins` CLI is that these scripts can be used even if BoomBoom is not running.
If BoomBoom is running, you need to restart it for the changes to take effect (whereas with `boomboom plugins` CLI, plugins/themes are dynamically loaded on the server).

To install/update a plugin or a theme from the disk:

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run plugin:install -- --plugin-path /local/plugin/path
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run plugin:install -- --plugin-path /local/plugin/path
```

:::

From NPM:

::: code-group

```bash
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run plugin:install -- --npm-name boomboom-plugin-myplugin
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run plugin:install -- --npm-name boomboom-plugin-myplugin
```

:::

To uninstall a plugin or a theme:

::: code-group

```bash [Classic installation]
cd /var/www/boomboom/boomboom-latest; \
    sudo -u boomboom NODE_CONFIG_DIR=/var/www/boomboom/config NODE_ENV=production npm run plugin:uninstall -- --npm-name boomboom-plugin-myplugin
```

```bash [Docker]
cd /var/www/boomboom-docker; \
    docker compose exec -u boomboom boomboom npm run plugin:uninstall -- --npm-name boomboom-plugin-myplugin
```

:::
