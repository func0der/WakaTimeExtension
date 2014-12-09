WakaTimeExtension
=================

This extension of WakaTime brings extended functionality to the dashboard of WakaTime.com

## Usage

To use the script you need to be on a project detail page.
Those are reachable from the dashboard homepage under **Projects**. Their urls should look like this: `https://wakatime.com/project/PROJECT_NAME`.

Currently there is no real support for external applications like GreaseMonkey (Firefox) or TamperMonkey (Chrome),
but it should be no problem to just paste the script in **script.js** into a new user script and use it as is.

To properly work with the script, you currently have to copy the code and paste it into the console of your
developer tools in your browser. It should work out of the box with Firebug, Web Developer Tools etc., because it
is plain JavaScript code.

## Future Plans
The current TODOs are hold in the **script.js**.

Hopefully this is no permanent script and it just needed as long as WakaTime has no
real good branch support back in their dashboard and API.

## Licensing

Please, be aware, that only the code surrounded by "// START OF CUSTOM CODE by func0der." and "// END OF CUSTOM CODE by func0der." is licensed under GPLv2.

The rest of the code is not mine and belongs to WakaTime.com.
