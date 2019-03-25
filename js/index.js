let settings = new pogomap.Settings(constants.mapbox_map_center, constants.mapbox_starting_zoom);
let map = new pogomap.Map(settings, allStyles, allLayers, allFilters);

document.addEventListener('DOMContentLoaded', () => {
    map.init('map');
    map.registerControlPosition('top-center');
    map.addControls(controls);
    map.loadTemplates(templates);
});