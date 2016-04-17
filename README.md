---
services: media-services
platforms: javascript
author: rajputam
---

# Media Services: Application Insights Plugin for Azure Media Player with Power BI dashboards

Application Insights Plugin for Azure Media Player with Power BI visualization

##Information
Analytics allow you to see how users are engaged with your products and services. Player analytics can provide insights into how viewers are consuming content and what they find most engaging. Whether you use video as your primary business or to support your business, player analytics allow you to see how users interact with your product or service, and can be used to grow your user base.

[Azure Media Player](http://aka.ms/azuremediaplayer) (AMP) is a free player built to playback content from Microsoft Azure Media Services. AMP reaches a wide variety of browsers and devices with simple HTML and JavaScript. It is easy to set up and use. [Try the demo](http://aka.ms/azuremediaplayer) now!

AMP is agnostic to a backend analytics service and works with various services. It supports a simple plugin model, outlined in our documentation, which can extend the player. This, in conjunction with the event model used in AMP, makes it easy to capture and send playback information to an analytics backend. This solution includes a Azure Media Player plugin for Application Insights, with data export to Azure Storage (optional) and dashboard visualization with Power BI (optional). 

To learn more, read the full [blog](https://azure.microsoft.com/en-us/blog/player-analytics-azure-media-player-plugin/) which includes pricing details for each related service.  You can also learn more about player analytics and this solution extension from the [document](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/blob/master/VideoTelemetry_AI.docx?raw=true).

###Preview of the finished Dashboard
![Dashboard Sample](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/raw/master/img/power-bi-dashboard.png)

###Plugin Options
Check out the supported [options](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/blob/master/options.md).  By default, the only custom event that will send with the plugin will be the playback summary.  This so that the amount of traffic that is sent from the client to Application Insights is limited yet still provides a large range of dimensions to filter on and metrics to calculate.

1. Dimensions for Filtering
	- Browser/OS information
	- Location
	- Time
	- Stream Id
	- Playback details (Streaming format, Content protection, playback technology, vod vs live) 
2. Metrics for calculations
	- time watched (total and in fullscreen)
	- precent of content viewed
	- rebuffering count and time
	- time to load player
	- average bitrate
	- errors

###Special Thanks
Special thanks to [William Zhang](https://github.com/willzhan) for his help and contribution in this project.

##Getting Started

###Set up Application Insights
1. Log into the [Azure Portal](https://portal.azure.com)
	- Don't have an Azure account, sign up for a [free trial](https://azure.microsoft.com/en-us/pricing/free-trial/)   
2. Create a new Application Insights resource. You can skip this step if you already have Application Insight's resource you'd like to use, you can skip this step
	- Select NEW -> DEVELOPER SERVICES -> APPLICATION INSIGHTS
	- Follow the on-screen wizard to complete the creation 

![Create Application Insights Resource](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/raw/master/img/app-insights-creation.png)
3. Get the Application Insights script with Instrumentation Key from your Application Insights resource
	- Select BROWSE -> APPLICATION INSIGHTS -> *YOUR NEW RESOURCE*
	- Select the QUICKSTART icon -> GET CODE TO MONITOR MY WEB PAGES 
	- Copy the code in the "End-user usage analytics code" which will include the instrumentation key
	
![Get Application Insights Instrumentation Key](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/raw/master/img/app-insights-instrumentation-key.png)

#####More Information
- [Visual Studio Application Insights](https://azure.microsoft.com/en-us/services/application-insights/)
- [Get started with Visual Studio Application Insights](https://azure.microsoft.com/en-us/documentation/articles/app-insights-get-started/)

###Add the plugin for Azure Media Player
1. Set up Azure Media Player in your web page.  See the AMP [documentation](http://aka.ms/ampdocs) and [samples](http://aka.ms/ampsamples).
2. Add the Application Insights "End-user usage analytics code" copied above, into the `<head>` of your html script *before* any other scripts including
3. Add the amp-appInsights.min.js script to the `<head>` of your html page *after* the AMP scripts

```html
<head>
<script type="text/javascript">
	var appInsights=window.appInsights||function(config){
	function r(config){t[config]=function(){var i=arguments;t.queue.push(function(){t[config].apply(t,i)})}}var t={config:config},u=document,e=window,o="script",s=u.createElement(o),i,f;for(s.src=config.url||"//az416426.vo.msecnd.net/scripts/a/ai.0.js",u.getElementsByTagName(o)[0].parentNode.appendChild(s),t.cookie=u.cookie,t.queue=[],i=["Event","Exception","Metric","PageView","Trace"];i.length;)r("track"+i.pop());return r("setAuthenticatedUserContext"),r("clearAuthenticatedUserContext"),config.disableExceptionTracking||(i="onerror",r("_"+i),f=e[i],e[i]=function(config,r,u,e,o){var s=f&&f(config,r,u,e,o);return s!==!0&&t["_"+i](config,r,u,e,o),s}),t
	}({
		//YOUR INSTRUMENTATION KEY HERE
		instrumentationKey:"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
	});
	window.appInsights=appInsights;
	appInsights.trackPageView();
</script>

<!--AMP Scripts: replace "latest" with a version number from http://aka.ms/ampchangelog -->
<link href="//amp.azure.net/libs/amp/latest/skins/amp-default/azuremediaplayer.min.css" rel="stylesheet">
<script src="//amp.azure.net/libs/amp/latest/azuremediaplayer.min.js"></script>

<!--Add the amp-appInsights plugin script -->
<script src="amp-appInsights.min.js"></script>

</head>
<body>
<video id="azuremediaplayer" class="azuremediaplayer amp-default-skin amp-big-play-centered" data-setup='{}' tabindex="0"></video>
</body>
```

4. Add the plugin to AMP at initialization to load with the instance of AMP
You can provide [options](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/blob/master/options.md) to the plugin either by passing them in the javascript or in the html.

```javascript
var myOptions = {
    "nativeControlsForTouch": false,
    autoplay: true,
    controls: true,
    width: "640",
    height: "400",
    plugins: {
        appInsights: {
            //add additonal plugin options here
            'debug': true
        }
    }
};
var myPlayer = amp("azuremediaplayer", myOptions);
myPlayer.src([{ src: "//amssamples.streaming.mediaservices.windows.net/91492735-c523-432b-ba01-faba6c2206a2/AzureMediaServicesPromo.ism/manifest", type: "application/vnd.ms-sstr+xml" }, ]);
```

The plugin will take in priority options provided in the javascript and will fall back to the defaults.  By default only the playback summary data will be sent as a custom event to your Application Insights account. 

###Seeing Data in Application Insights
You can drill down and view your data directly in Application Insights.

1. Go to the [Azure Portal](https://portal.azure.com)
2. Go to your Application Insights resource: BROWSE -> APPLICATION INSIGHTS -> *YOUR RESOURCE*.  You will see the pane containing general info of your resource and the Setting pane also appears on the right.

- You can specify the time range of your interest via Time Range icon at the top;
- You can go into Metric Explorer by clicking on Metric Explorer icon at the top.
- You can invoke Settings and Diagnostics pane any time by clicking on Settings icon at the top;
- In Settings and Diagnostics pane, you can click on Usage button to go to Usage data;

![Application Insights Graphs](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/raw/master/img/app-insights-graph.png)

For more information, please see [usage and pricing](https://azure.microsoft.com/en-us/pricing/details/application-insights/) information.

##Power BI Reports (optional)
Power BI dashboard creation is option as you are able to view your data in Application Insights. However, it truly brings your data to life with easy to comprehend dashboards.  The following dashboard reports are pre-created for your convenience, however you are more than welcome to create your own dashboard inside of Power BI.

If you don't already have an account, you can sign up for [Power BI](https://powerbi.com) today. For more information, please see [usage and pricing](https://powerbi.microsoft.com/en-us/pricing/) information.

###Application Insights Connector
The Application Insights Connector for Power BI is a convenient way to connect and show your basic application usage data.  At the time of writing this guide, only basic events get plumbed through to Power BI thought his connector.  For some users, this may have value and provide a basic overview of the content that is not playback specific.

1. Log into [Power BI](https://powerbi.com)
2. In the bottom left corner, select GET DATA. If the left pane menu is not expanded, you will see the arrow, which is the button for GET DATA.
3. Under CONTENT PACK SERVICES, select GET under the SERVICES tab.
4. Select APPLICATION INSIGHTS > CONNECT
5. Follow the on-screen wizard to enter your Application Insights resource details. You can find all details about your Application Insights resource from the [Azure Portal](https://portal.azure.com)

![Application Insights Connector](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/raw/master/img/app-insights-power-bi-connector.png)

30 days of data is retained in Power BI through this connector.

###Long term retention dashboards
For longer term retention, and media central dashboards, its important to pull the data source from somewhere that allows for long term retention of data.  Application Insights has a feature to continuously export your data into Azure Storage in blobs.  Power BI has the ability to use Azure Storage as an input location for a dataset; which can be scheduled to refresh.  Power BI can refresh datasets up to 8 time per day for Pro and once per day for free.

####Azure Blob Storage
1. Go to your Application Insights resource in the [Azure Portal](https://portal.azure.com)
2. Select SETTINGS > CONTINUOUS EXPORT > ADD
3. Select CONFIGURED to select the data types you want to export. You should at least have CUSTOM EVENTS and METRIC on.
4. Select DESTINATION STORAGE CONTAINER to select or create a new storage container.
5. Select the storage account and add a container with Access Type as blob.
6. Click OK

Note it may take some time for the first export to complete - you will see "awaiting telemetry" as the status. You must wait until the first export is complete to continue. 

![Continuous Export from Application Insights](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/raw/master/img/continuous-export.png)

####Connecting to Power BI
In order to connect blob storage with Power BI, you will need to use the Power BI Desktop which is available which you can [download](https://powerbi.microsoft.com/en-us/desktop/).

1. Open ["amp_appinsights.pbix"](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/blob/master/amp_appinsights.pbix?raw=true) in the Power BI Desktop tool. It is normal to see "X Something is wrong on one or more fields" for each graph as the data has not yet been added.  
2. Select EDIT QUERIES in the HOME menu on the top bar. AMP_data should be selected.
3. Select ADVANCED EDITOR and replace the entire query with the text from ["amp-appInsights-advanced-editor-query.txt"](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/blob/master/amp-appInsights-advanced-editor-query.txt).  
	- Make sure to replace `AZURESTORAGENAME` from the query line `Source = AzureStorage.Blobs("AZURESTORAGENAME")`to the name of your blob storage 
	- Make sure to replace `CONTAINERNAME` from the query line `ampdata = Source{[Name="CONTAINERNAME"]}[Data]`to the name of your container in the blob storage 

![Power BI Advanced Query](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/raw/master/img/power-bi-query.png)

4. Select the SOURCE under APPLIED STEPS and then select EDIT CREDENTIALS

![Edit credentials](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/raw/master/img/blob-key.png)

5. Enter your account key which can be obtained from the [Azure Portal](https://portal.azure.com). Go to your storage account resource, select the keys icon, and then copy the key into Power BI.

![Get Storage Key](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/raw/master/img/storage-keys.png)

6. Select CLOSE AND APPLY in the query editor
7. Click PUBLISH and select destination

You can now view your live report in [Power BI](https://powerbi.com) where you can modify and share.

![Publish](https://github.com/Azure-Samples/media-services-javascript-azure-media-player-application-insights-plugin/raw/master/img/publish.png)

####Scheduling refresh frequency for the data set
1. Log into [Power BI](https://powerbi.com)
2. Open the left pane. Under DATASETS, click the "..." beside "amp_appinsights"
3. Select SCHEDULE REFRESH
4. Open the SCHEDULE REFRESH menu
5. Change the "Keep your data up to date" to YES
6. Select a refresh frequency of daily
7. Under TIME, select ADD ANOTHER TIME, and select a time. Depending on your tier of Power BI, you add multiple times
8. Click Apply

## TODO

- [ ] Integrate with Application Insights Analytics
- [ ] Integrate blob storage with Azure SQL DW for better Power BI performance