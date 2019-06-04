# Options
The following options are supported:

## streamId

Name of the stream or event to track and filter on.

**default:** source of the video path so if the path is ```http://amssamples.streaming.mediaservices.windows.net/91492735-c523-432b-ba01-faba6c2206a2/AzureMediaServicesPromo.ism/manifest(format=mpd-time-csf)``` the label would be ```amssamples.streaming.mediaservices.windows.net/91492735-c523-432b-ba01-faba6c2206a2/AzureMediaServicesPromo.ism/manifest```

## userId

By default, the user is identified by placing a cookie. A user who uses multiple browsers or devices will be counted more than once. If your web app lets users sign in, you can get a more accurate count by providing Application Insights with a unique user identifier. It doesn't have to be their name, or the same id that you use in your app. 

If your app groups users into accounts, you can also pass an identifier for the account, `accountId` if you use `userId`. 

The user and account ids must not contain spaces or the characters `,;=|`

## debug
If set to false, console logs will be omitted
**default:** ```false```

## metricsToTrack

These are the metrics you want to send to Application Insights (known as custom events in Application Insights). All metrics send with the following properties to be able to filter on:

- `StreamId`: name of stream of event
- `PluginVersion`: plugin version
- `PlayerVersion`: version of Azure Media Player
- `PlabackTech`: Technology used to playback content - `AzureHtml5Js`, `FlashSS`, `SilverlightSS`, `Html5`
- `MimeType`: Streaming format using mime type
- `ProtectionType`: `none`, `aes`, `drm`
- `isLive`: is the content live
- `trackSdn` (if enabled): tracks if an SDN or eCDN was used
 
**default:** The only metrics tracked by default is playbackSummary.
`['playbackSummary']`

Here are some more details about metrics:

#### ```playbackSummary```

sends a summary of the playback with the following details:

- `playTime`: Time in seconds of how long the viewer watched the content
- `fullscreenTime`: Time in seconds the user spent in fullscreen
- `rebufferCount`: Number of times the viewer experienced rebuffering
- `rebufferTime`: Total time in milliseconds that the user spent rebuffering
- `loadTime`: Time in milliseconds to load the stream into player 
- `percentPlayed`: Percentage of content out of the entire duration that was watched. This is currently not available for live content.
- `avgBitrate`: If the playback technology allows the information to be gathered, this provides the average bitrate of the fragment downloads in bps
- `failedDownloads`: Number of failed downloaded fragments (this does not signify there was a playback error as there is player retry logic and robustness)
- `errorCode`: If applicable, provides the error code.

#### `loaded` 
sends an event whenever the player is loaded on ```loadedmetadata``` event from the player with information about the loading time in milliseconds. Note, just because the player is loaded, does not mean a view took place
#### `viewed` 
sends when a player actually starts playing.
#### `ended` 
sends an event that the end of the video was reached
#### `playTime` 
sends an event when the page is closed or if the stream is switched regarding cumulative amount that the video was watched in seconds
#### `percentsPlayed` 
will send an event every X percents. X being defined by the option ```percentsPlayedInterval```.
#### `play`
sends an event on each play action from the player
#### `pause` 
sends an event on each pause action from the player
#### `seek` 
sends an event on each seek action from the player
#### `fullscreen` 
sends event when entering and exiting fullscreen
#### `error`
sends on an error event with information about when the error occurred and what the HEX code of the error was.  It also sends a trace with the error when applicable 
#### `buffering` 
sends an event when buffering occurs with the value of the time spend buffering
#### `bitrateQuality`
sends the average bitrate after the stream is finishes, changes or the user exits
#### `downloadInfo`
sends the information about each downloaded for both completion for media segments providing bitrate, measured bandwidth and perceived bandwidth. It fires on failed segment downloads.

##percentsPlayedInterval

This options goes with the ```percentsPlayed``` event. Every ```percentsPlayedInterval``` percents an event will be sent to Application Insights.
**default:** 20

##trackSdn
Adds SDN tracking into properties when tracking metrics.
**default:** false
