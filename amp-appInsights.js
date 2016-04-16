/*
*
* Application Insights plugin for Azure Media Player - Microsoft Sample Code - Copyright (c) 2016 - Licensed MIT
* Attribution: Google Analytics plugin for Azure Media Player - Microsoft Sample Code - Copyright (c) 2015 - Licensed MIT
* Attribution: "videojs-ga - v0.4.2" - Copyright (c) 2015 Michael Bensoussan - Licensed MIT
*
*/

(function () {
    var __indexOf = [].indexOf || function (item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

    amp.plugin('appInsights', function (options) {
        var player = this;

        var pluginVersion = 0.1;
        var parsedOptions;
        if (options == null) {
            options = {};
        }
        var dataSetupOptions = {};
        if (this.options()["data-setup"]) {
            parsedOptions = JSON.parse(this.options()["data-setup"]);
            if (parsedOptions.ga) {
                dataSetupOptions = parsedOptions.ga;
            }
        }

        //App Insights Config
        appInsights.config.maxBatchInterval = sendInterval = options.sendInterval || dataSetupOptions.sendInterval || 15;
        appInsights.config.disableFlushOnBeforeUnload = true;


        //Setting plugin options

        /* All implemented metrics include: ['loaded', 'viewed', 'ended', 'playTime', 'percentsPlayed', 'play', 'pause', 'seek', 'fullscreen', 'error', 'buffering', 'bitrateQuality', 'playbackSummary', 'downloadInfo']; */
        var defaultMetricsToTrack = ['playbackSummary'];

        var listMetricsToTrack = options.metricsToTrack || dataSetupOptions.metricsToTrack || defaultMetricsToTrack;
        var metricsToTrack = {};
        listMetricsToTrack.forEach(function (value, index, array) {
            metricsToTrack[value] = true;
        });


        var percentsPlayedInterval = options.percentsPlayedInterval || dataSetupOptions.percentsPlayedInterval || 20;
        options.debug = options.debug || false;

        //TrackEvent Properties
        if (options.userId || dataSetupOptions.userId) {
            //setting authenticated user context
            var userId = options.userId || dataSetupOptions.userId;
            var accountId = options.accountId || dataSetupOptions.accountId || null;
            appInsights.setAuthenticatedUserContext(userId, accountId);
            if (options.debug) {
                console.log("Authenticated User Context set as userId: " + userId + " and accountId: " + accountId);
            }
        }

        var streamId = options.streamId || dataSetupOptions.streamId || null;

        //enable if you hav SDN or eCDN intentration with AMP
        var trackSdn = options.trackSdn || dataSetupOptions.trackSdn || false;

        //Initializing tracking variables
        var percentsAlreadyTracked = [];
        var lastPercentTracked = -1;
        var percentPlayed = 0;
        var seeking = false;
        var currentProtectionInfo = null;

        //Trim the manifest url to get a streamId
        function mapManifestUrlToId(manifest) {
            var sourceManifest = "unknown";
            if (manifest) {
                sourceManifest = manifest.split("//")[1];
                if (sourceManifest.match(/.ism\/manifest/i)) {
                    sourceManifest = sourceManifest.split(/.ism\/manifest/i)[0] + ".ism/manifest";
                }
            }
            return sourceManifest;
        }

        function mapProtectionInfo(protectionType) {
            var protectionInfo = "unknown";
            if (protectionType) {
                switch (protectionType.toLowerCase()) {
                    case "aes":
                        protectionInfo = "aes";
                        break;
                    case "playready":
                        protectionInfo = "drm";
                        break;
                    case "widevine":
                        protectionInfo = "drm";
                        break;
                    case "fairplay":
                        protectionInfo = "drm";
                        break;
                    default:
                        protectionInfo = "none";
                }
            }
            return protectionInfo;
        }

        //Calculating bufferedAhead *Does not work in SilverlightSS
        function calculateBufferAhead() {
            var buffered = myPlayer.buffered();
            var currentTime = myPlayer.currentTime();

            if (!buffered) {
                return undefined;
            }

            return Math.max(0, buffered.end(buffered.length - 1) - currentTime);
        }

        //Loading information for tracking start, load times, unload events
        //loadTime is in milliseconds
        var load = {
            loadTime: 0,
            //incase loadedmetadata doesn't fire set start time
            loadTimeStart: new Date().getTime(),
            firstPlay: false,
            endedReached: false,
            videoElementUsed: false,
            unloaddatasent: false,
            updateLoadTime: function () {
                this.loadTime = Math.abs(new Date().getTime() - this.loadTimeStart);
                if (options.debug) {
                    console.log("Player Load Time determined: " + this.loadTime + "ms");
                }
                this.send();
            },
            send: function () {
                //removing outliers @100s for load
                if (metricsToTrack.loaded) {
                    if (this.loadTime < 100000) {
                        trackEvent("loadTime", { "time": this.loadTime });
                    }
                }
            },
            reset: function () {
                this.loadTime = 0;
                this.loadTimeStart = new Date().getTime();
                this.firstPlay = false;
                this.endedReached = false;
                var streamId = options.streamId || dataSetupOptions.streamId || null;
            }
        }

        //Buffering information for tracking waiting events
        //bufferingTime is in milliseconds
        var buffering = {
            state: false,
            bufferingTime: 0,
            bufferingTimeStart: 0,
            bufferingTimeTotal: 0,
            count: 0,
            enterBuffering: function () {
                if (load.firstPlay) {
                    this.bufferingTimeStart = new Date().getTime();
                    this.state = true;
                    this.count++;
                    if (options.debug) {
                        console.log("Entering buffering state...");
                    }
                }
            },
            send: function () {
                if (this.state) {
                    this.bufferingTime = Math.abs(new Date().getTime() - this.bufferingTimeStart);
                    var currentTime = Math.round(player.currentTime());
                    if (currentTime !== 0) {
                        if (metricsToTrack.buffering) {

                            bufferingMetrics = {
                                'currentTime': currentTime,
                                'bufferingTime': this.bufferingTime,
                            };
                            if (download.videoBuffer) {
                                bufferingMetrics.perceivedBandwidth = download.videoBuffer.perceivedBandwidth;
                            }
                            if (calculateBufferAhead) {
                                bufferingMetrics.buffered = calculateBufferAhead;
                            }

                            trackEvent('buffering', bufferingMetrics)
                        }
                    }
                    this.bufferingTimeTotal += this.bufferingTime;
                    this.state = false;
                    if (options.debug) {
                        console.log("Exiting buffering state.  Time spent rebuffering was " + this.bufferingTime + "ms");
                    }
                }
            },
            reset: function () {
                this.bufferingTime = 0;
                this.state = false;
            },
            fullReset: function () {
                this.bufferingTime = 0;
                this.bufferingTimeStart = 0;
                this.bufferingTimeTotal = 0;
                this.count = 0;
                this.state = false;
            }
        }

        var download = {
            videoBuffer: null,
            audioBuffer: null,
            sumBitrate: 0,
            sumPerceivedBandwidth: 0,
            sumMeasuredBandwidth: 0,
            downloadedChunks: 0,
            failedChunks: 0,
            completed: function () {
                if (player.currentDownloadBitrate()) {
                    this.downloadedChunks += 1;
                    this.sumBitrate += player.currentDownloadBitrate();

                    if (this.videoBuffer) {
                        if (metricsToTrack.downloadInfo) {
                            trackEvent("downloadCompleted", { "bitrate": player.currentDownloadBitrate(), "measuredBandwidth": this.videoBuffer.downloadCompleted.measuredBandwidth, "perceivedBandwidth": this.videoBuffer.perceivedBandwidth })
                        }

                        this.sumPerceivedBandwidth += this.videoBuffer.perceivedBandwidth;
                        this.sumMeasuredBandwidth += this.videoBuffer.downloadCompleted.measuredBandwidth;
                    }
                }
            },
            failed: function (type) {
                if (metricsToTrack.downloadInfo) {

                    if (type.toLowerCase() == "audio") {
                        var isVideo = 0;
                        var code = this.audioBuffer.downloadFailed.code.toString(8);
                    } else {
                        var isVideo = 1;
                        var code = this.videoBuffer.downloadFailed.code.toString(8);
                    }

                    trackEvent("downloadFailed", { "isVideo": isVideo, "error": code });
                }
                this.failedChunks++;
            },
            send: function () {
                if (metricsToTrack.bitrateQuality) {
                    if (this.downloadedChunks > 0) {
                        bitrateQualityMetrics = {
                            "avgBitrate": this.sumBitrate / this.downloadedChunks
                        }

                        if (this.videoBuffer) {

                            var AverageMeasuredBandwidth = Math.round(this.sumMeasuredBandwidth / this.downloadedChunks);
                            var AveragePerceivedBandwidth = Math.round(this.sumPerceivedBandwidth / this.downloadedChunks);

                            bitrateQualityMetrics.avgMeasuredBandwidth = AverageMeasuredBandwidth;
                            bitrateQualityMetrics.avgPerceivedBandwidth = AveragePerceivedBandwidth;

                        }

                        trackEvent("bitrateQuality", bitrateQualityMetrics);
                    }
                }
            },
            reset: function () {
                this.videoBuffer = null;
                this.audioBuffer = null;
                this.sumBitrate = 0;
                this.sumPerceivedBandwidth = 0;
                this.sumMeasuredBandwidth = 0;
                this.downloadedChunks = 0;
                this.failedChunks = 0;
            }
        }

        //playIntervals tracks the intervals of time in which the viewer watched on
        var playIntervals = {
            startTime: 0,
            endTime: 0,
            added: false,
            lastCheckedTime: 0,
            arrayOfTimes: [],
            overlappingArrayOfTimes: [],
            sorted: false,
            totalSecondsFullscreen: 0,
            sortAlgorithm: function (a, b) {

                if (a[0] < b[0]) return -1;
                if (a[0] > b[0]) return 1;
                return 0;

            },
            update: function (time) {
                if (time == this.lastCheckedTime + 1) {
                    if (player.isFullscreen()) {
                        this.totalSecondsFullscreen += 1;
                    }
                }

                if (!(time == this.lastCheckedTime || time == this.lastCheckedTime + 1)) {
                    this.endTime = this.lastCheckedTime;
                    this.push();
                    this.startTime = time;
                    this.added = false;
                }
                this.lastCheckedTime = time;

            },
            push: function () {
                this.arrayOfTimes.push([this.startTime, this.endTime]);
                this.added = true;
            },
            getOverlappingArrayOfTimes: function () {
                if (!this.added) {
                    this.endTime = Math.round(player.currentTime());
                    this.push();
                }
                this.arrayOfTimes = this.arrayOfTimes.sort(this.sortAlgorithm);


                if (this.arrayOfTimes.length > 1) {
                    this.overlappingArrayOfTimes.push(this.arrayOfTimes[0]);
                    for (var i = 1; i < this.arrayOfTimes.length; i++) {
                        if (this.arrayOfTimes[i][0] <= this.overlappingArrayOfTimes[this.overlappingArrayOfTimes.length - 1][1]) {
                            if (this.arrayOfTimes[i][1] > this.overlappingArrayOfTimes[this.overlappingArrayOfTimes.length - 1][1]) {
                                var t0 = this.overlappingArrayOfTimes[this.overlappingArrayOfTimes.length - 1][0];
                                var t1 = this.arrayOfTimes[i][1];
                                this.overlappingArrayOfTimes.pop();
                                //overlappingArrayOfTimes
                                this.overlappingArrayOfTimes.push([t0, t1]);
                            }
                        } else {
                            this.overlappingArrayOfTimes.push(this.arrayOfTimes[i]);
                        }
                    }
                } else {
                    this.overlappingArrayOfTimes = this.arrayOfTimes;
                }

                this.sorted = true;
            },
            getTotalPlayTime: function () {
                if (!this.sorted) {
                    this.getOverlappingArrayOfTimes();
                }
                var TotalPlayTime = 0;
                for (var i = 0; i < this.arrayOfTimes.length; i++) {
                    TotalPlayTime += this.arrayOfTimes[i][1] - this.arrayOfTimes[i][0];
                }
                return Math.round(TotalPlayTime);
            },
            getTotalUniquePlayTime: function () {
                if (!this.sorted) {
                    this.getOverlappingArrayOfTimes();
                }
                var TotalUniquePlayTime = 0;
                for (var i = 0; i < this.overlappingArrayOfTimes.length; i++) {
                    TotalUniquePlayTime += this.overlappingArrayOfTimes[i][1] - this.overlappingArrayOfTimes[i][0];
                }
                return Math.round(TotalUniquePlayTime);
            },
            reset: function () {

                this.startTime = 0;
                this.endTime = 0;
                this.totalSecondsFullscreen = 0;
                this.added = false;
                this.sorted = false;
                this.arrayOfTimes = [];
                this.overlappingArrayOfTimes = [];
            }
        };

        //Timer for playTime tracking for Live playback
        //Tracking totalSeconds in seconds
        var playTimeLive = {
            totalSeconds: 0,
            totalSecondsFullscreen: 0,
            start: function () {
                var self = this;
                this.interval = setInterval(function () {
                    self.totalSeconds += 1;
                    if (player.isFullscreen()) {
                        self.totalSecondsFullscreen += 1;
                    }
                }, 1000);
            },
            pause: function () {
                clearInterval(this.interval);
                delete this.interval;
            },
            resume: function () {
                if (!this.interval) this.start();
            },
            send: function () {
                trackEvent('playTime', { "time": this.totalSeconds });
            },
            reset: function () {
                this.totalSeconds = 0;
                this.totalSecondsFullscreen = 0;
            }
        };

        var sourceset = function () {

            if (load.videoElementUsed) {
                unloadData();
            }

            //resetting state for source change scenario
            load.reset()
            buffering.fullReset();
            playTimeLive.reset();
            playIntervals.reset();
            download.reset();
            percentPlayed = 0;
            lastPercentTracked = null;
            currentProtectionInfo = null;
            streamId = null;
            if (options.debug) {
                console.log("Resetting App Insight Plugin Config");
            }

        }

        var loaded = function () {

            streamId = options.streamId || dataSetupOptions.streamId || null;
            if (!streamId) {
                streamId = mapManifestUrlToId(player.currentSrc());
            }
            if (options.debug) {
                console.log("streamId set as: " + streamId);
            }

            if (player.currentProtectionInfo()) {
                currentProtectionInfo = mapProtectionInfo(player.currentProtectionInfo()[0].type);
            } else {
                currentProtectionInfo = "none";
            }

            if (options.debug) {
                console.log("protectionInfo set as: " + currentProtectionInfo);
            }


            //sending loadedmetadata event
            if (metricsToTrack.loaded) {
                trackEvent('loadedmetadata');
            }

            //used to track if the video element is reused to appropriately send unload data
            load.videoElementUsed = true;

        };

        var canplaythrough = function () {
            load.updateLoadTime();
        }

        var timeupdate = function () {
            if (streamId) {
                var currentTime = Math.round(player.currentTime());

                if (metricsToTrack.playbackSummary || metricsToTrack.playTime) {
                    playIntervals.update(currentTime);
                }

                if (metricsToTrack.percentsPlayed) {
                    //Currently not tracking percentage watched information for Live
                    if (!this.isLive()) {
                        var duration = Math.round(player.duration());

                        var currentTimePercent = Math.round(currentTime / duration * 100);
                        if (currentTimePercent != lastPercentTracked) {

                            if (currentTimePercent % percentsPlayedInterval == 0 && currentTimePercent <= 100) {
                                if (__indexOf.call(percentsAlreadyTracked, currentTimePercent) < 0) {
                                    if (currentTimePercent !== 0) {
                                        percentPlayed += percentsPlayedInterval;
                                    }
                                    percentsAlreadyTracked.push(currentTimePercent);
                                }
                                trackEvent("percentReached", { "percent": currentTimePercent });
                            }
                        }
                        lastPercentTracked = currentTimePercent;
                    }
                }


                if (metricsToTrack.bitrateQuality || metricsToTrack.playbackSummary) {
                    if (!download.videoBuffer && player.currentDownloadBitrate()) {
                        download.completed();
                    }
                }
            }
        };

        var play = function () {
            if (metricsToTrack.play) {
                var currentTime;
                currentTime = Math.round(player.currentTime());
                trackEvent('play', { 'currentTime': currentTime });
            }
        };

        var playing = function () {
            seeking = false;
            if (!load.firstPlay) {
                if (metricsToTrack.viewed) {
                    trackEvent("viewed");
                }
                load.firstPlay = true;
            }
            if (metricsToTrack.buffering || metricsToTrack.playbackSummary) {
                buffering.send();
            }

            if (metricsToTrack.playTime || metricsToTrack.playbackSummary) {
                if (player.isLive()) {
                    if (playTimeLive.totalSeconds == 0) {
                        playTimeLive.start();
                    } else {
                        playTimeLive.resume();
                    }
                }
            }
        }


        var pause = function () {


            if (metricsToTrack.playTime || metricsToTrack.playbackSummary) {
                if (player.isLive()) {
                    playTimeLive.pause();
                }
            }

            if (metricsToTrack.pause) {
                var currentTime = Math.round(player.currentTime());
                var duration = Math.round(player.duration());

                if (currentTime !== duration && !seeking) {
                    if (metricsToTrack.pause) {
                        trackEvent('pause', { 'currentTime': currentTime });
                    }
                }
            }
        }

        var seek = function () {
            seeking = true;

            if (metricsToTrack.seek) {
                //add seekingTime
                var currentTime = Math.round(player.currentTime());
                trackEvent('seek', { 'currentTime': currentTime });
            }
        }

        var end = function () {
            if (metricsToTrack.playTime||metricsToTrack.playbackSummary) {
                if (player.isLive()) {
                    playTimeLive.pause();
                }
            }
            if (metricsToTrack.ended) {
                if (!load.endedReached) {
                    trackEvent('ended');
                    load.endedReached = true;
                }
            }
        };

        var waiting = function () {
            buffering.enterBuffering();
        }

        var downloadcompleted = function () {
            download.completed();
        }

        var downloadfailed = function () {

        }

        var fullscreen = function () {
            var currentTime = Math.round(player.currentTime());
            if ((typeof player.isFullscreen === "function" ? player.isFullscreen() : void 0) || (typeof player.isFullScreen === "function" ? player.isFullScreen() : void 0)) {
                //enter fullscreen
                trackEvent('fullscreen', { 'enter': 1, 'currentTime': currentTime });
            } else {
                //exit fullscreen
                trackEvent('fullscreen', { 'enter': 0, 'currentTime': currentTime });
            }
        };

        var error = function () {
            if (load.loadTime == 0) {
                load.updateLoadTime();
            }

            if (metricsToTrack.playTime || metricsToTrack.playbackSummary) {
                if (player.isLive()) {
                    playTimeLive.pause();
                }
            }
            if (metricsToTrack.error) {
                var currentTime = Math.round(player.currentTime());
                var errorHexCode = player.error().code.toString(16);
                trackEvent("error", { "code": errorHexCode, 'currentTime': currentTime });
            }
        };

        function exit() {
            //Check that you haven't already sent this data
            //iOS fires event twice
            if (!load.unloaddatasent) {
                load.unloaddatasent = true;
                unloadData();
            }
        };

        function unloadData() {

            var totalPlayTime = playTimeLive.totalSeconds;
            var totalFullscreenTime = playTimeLive.totalSecondsFullscreen;
            var totalPercentViewed = Math.min(percentPlayed, 100);


            if (!player.isLive()) {
                totalPlayTime = playIntervals.getTotalPlayTime();
                totalFullscreenTime = playIntervals.totalSecondsFullscreen;
                totalPercentViewed = Math.min(Math.round((playIntervals.getTotalUniquePlayTime() / player.duration()) * 100), 100);
            } 

            if (load.loadTime == 0) {
                load.updateLoadTime();
            }

            if (buffering.state) {
                buffering.send();
            }

            //send events
            if (metricsToTrack.playTime) {
                playTimeLive.send();
            }
            if (metricsToTrack.percentsPlayed) {
                if (!player.isLive()) {
                    trackEvent("percentPlayed", { "percentage": percentPlayed });
                }
            }
            if (metricsToTrack.bitrateQuality) {
                download.send();
            }
            if (metricsToTrack.buffering) {
                trackEvent('rebufferTime', { 'count': buffering.count, "totalRebufferTime": buffering.bufferingTimeTotal })
            }
            if (metricsToTrack.playbackSummary) {
                var playbackSummaryMetric = {
                    "playTime": totalPlayTime,
                    "fullscreenTime": totalFullscreenTime,
                    "rebufferCount": buffering.count,
                    "rebufferTime": buffering.bufferingTimeTotal
                }

                if (load.loadTime <= 100000) {
                    //removing outliers when loadTime cannot be properly calculated because browser doesn't accurately call events
                    playbackSummaryMetric.loadTime = load.loadTime;
                }
                if (!player.isLive()) {
                    playbackSummaryMetric.percentPlayed = totalPercentViewed;
                }

                if (download.downloadedChunks > 0) {
                    var avgBitrate = Math.round(download.sumBitrate / download.downloadedChunks);
                    playbackSummaryMetric.avgBitrate = avgBitrate;
                }

                if (download.videoBuffer) {
                    playbackSummaryMetric.failedDownloads = download.failedChunks;
                }
                if (player.error()) {
                    playbackSummaryMetric.errorCode = player.error().code.toString(16);
                }
                

                trackEvent("playbackSummary", playbackSummaryMetric);
            }
            appInsights.flush();
        }

        var trackEvent = function (event, metricsObj) {
            if (window.appInsights) {
                var properties = {
                    StreamId: streamId || "unknown",
                    PluginVersion: pluginVersion,
                    PlayerVersion: player.getAmpVersion() || "unknown",
                    PlaybackTech: player.currentTechName() || "unknown",
                    MimeType: player.currentType() || "unknown",
                    ProtectionType: currentProtectionInfo || "unkown",
                    isLive: player.isLive() ? "live" : "vod" || "unknown",
                };

                //additional logic incase loadedmetadata event hasn't fired to set streamId
                if (!streamId) {
                    var sourceManifest = "unknown";
                    if (player.options_.sourceList[0]) {
                        sourceManifest = player.options_.sourceList[0].src.split("//")[1];
                        if (sourceManifest.match(/.ism\/manifest/i)) {
                            sourceManifest = sourceManifest.split(/.ism\/manifest/i)[0] + ".ism/manifest"
                        }
                    }
                    properties.StreamId = sourceManifest;

                }

                //additional logic incase loadedmetadata event hasn't fired to set protetction info
                if (!currentProtectionInfo) {
                    var protectionInfo = "unknown";
                    if (player.options_.sourceList[0]) {
                        if (player.options_.sourceList[0].protectionInfo) {
                            protectionInfo = mapProtectionInfo(player.options_.sourceList[0].protectionInfo[0].type);
                        } else {
                            protectionInfo = "none";
                        }
                    }
                    properties.ProtectionType = protectionInfo;
                }

                if (trackSdn) {
                    properties.Sdn = player.options_.sdn.name || "none";
                }

                var metrics = metricsObj || {};

                appInsights.trackEvent(event, properties, metrics);

                if (options.debug) {
                    console.log("sent to Application Insights...'event': " + event + "\n'properties': " + JSON.stringify(properties) + "\n'metrics': " + JSON.stringify(metrics));
                }

                if (event == "error") {
                    properties.errorMessage = player.error().message;

                    appInsights.trackTrace(event, properties, metrics);
                    if (options.debug) {
                        console.log("sent to Application Insights Error Trace...'message': " + event + "\n'properties': " + JSON.stringify(properties) + "\n'metrics': " + JSON.stringify(metrics));
                    }

                }
            } else if (options.debug) {
                console.log("App Insights not detected");
            }
        }

        //add event listeners for tracking
        player.addEventListener("sourceset", sourceset);
        player.addEventListener("loadedmetadata", loaded);
        player.addEventListener("canplaythrough", canplaythrough);

        if (metricsToTrack.bitrateQuality || metricsToTrack.downloadInfo || metricsToTrack.playbackSummary) {
            //does this double send on a change source?
            player.addEventListener("loadedmetadata", function () {
                download.videoBuffer = player.videoBufferData();
                if (download.videoBuffer) {
                    download.videoBuffer.addEventListener("downloadcompleted", function () { download.completed() });
                    download.videoBuffer.addEventListener("downloadfailed", function () { download.failed("video") });

                }
                download.audioBuffer = player.audioBufferData();
                if (download.audioBuffer) {
                    download.audioBuffer.addEventListener("downloadfailed", function () { download.failed("audio") });
                }
            });
        }

        if (metricsToTrack.percentsPlayed || metricsToTrack.bitrateQuality || metricsToTrack.playbackSummary || metricsToTrack.playTime) {
            player.addEventListener("timeupdate", timeupdate);
        }

        player.addEventListener("playing", playing);
        if (metricsToTrack.playTime || metricsToTrack.bitrateQuality || metricsToTrack.playbackSummary) {
            window.addEventListener("onbeforeunload", exit, false);
            window.addEventListener("pagehide", exit, false);
            //check dispose to send data
            player.tempDispose = player.dispose;
            player.dispose = function () {
                unloadData();
                player.tempDispose();
            }
        }
        if (metricsToTrack.error || metricsToTrack.playTime || metricsToTrack.playbackSummary) {
            player.addEventListener("error", error);
        }
        if (metricsToTrack.end || metricsToTrack.playTime || metricsToTrack.playbackSummary) {
            player.addEventListener("ended", end);
        }
        if (metricsToTrack.play) {
            player.addEventListener("play", play);
        }
        if (metricsToTrack.pause || metricsToTrack.playTime || metricsToTrack.buffering || metricsToTrack.playbackSummary) {
            player.addEventListener("pause", pause);
        }
        if (metricsToTrack.buffering || metricsToTrack.playbackSummary) {
            player.addEventListener("waiting", waiting);
        }
        if (metricsToTrack.buffering || metricsToTrack.seek || metricsToTrack.playbackSummary) {
            player.addEventListener("seeked", seek);
        }
        if (metricsToTrack.fullscreen) {
            player.addEventListener("fullscreenchange", fullscreen);
        }

    });

}).call(this);