/// Normalized hit boxes for the first (YUL) cockpit. Rules are server-side.
class CockpitSlot {
  const CockpitSlot(this.id, this.title, this.owner, this.kind,
      this.x, this.y, this.width, this.height, {this.values = const [], this.order});
  final String id, title, owner, kind;
  final double x, y, width, height;
  final List<int> values;
  final int? order;
}

const cockpitSlots = <CockpitSlot>[
  CockpitSlot('radio_p', 'Funk', 'pilot', 'radio', .06, .15, .14, .07),
  CockpitSlot('radio_c1', 'Funk I', 'copilot', 'radio', .80, .13, .14, .07),
  CockpitSlot('radio_c2', 'Funk II', 'copilot', 'radio', .80, .22, .14, .07),
  CockpitSlot('axis_p', 'Ruder', 'pilot', 'axis', .29, .24, .15, .075),
  CockpitSlot('axis_c', 'Ruder', 'copilot', 'axis', .56, .24, .15, .075),
  CockpitSlot('engine_p', 'Schub', 'pilot', 'engine', .38, .62, .12, .075),
  CockpitSlot('engine_c', 'Schub', 'copilot', 'engine', .52, .62, .12, .075),
  CockpitSlot('gear_1', '1/2', 'pilot', 'gear', .06, .37, .14, .07, values:[1,2], order:0),
  CockpitSlot('gear_2', '3/4', 'pilot', 'gear', .06, .47, .14, .07, values:[3,4], order:1),
  CockpitSlot('gear_3', '5/6', 'pilot', 'gear', .06, .57, .14, .07, values:[5,6], order:2),
  CockpitSlot('flaps_1', '1/2', 'copilot', 'flaps', .80, .34, .14, .07, values:[1,2], order:0),
  CockpitSlot('flaps_2', '2/3', 'copilot', 'flaps', .80, .44, .14, .07, values:[2,3], order:1),
  CockpitSlot('flaps_3', '4/5', 'copilot', 'flaps', .80, .54, .14, .07, values:[4,5], order:2),
  CockpitSlot('flaps_4', '5/6', 'copilot', 'flaps', .80, .64, .14, .07, values:[5,6], order:3),
  CockpitSlot('brake_1', '2', 'pilot', 'brake', .32, .77, .10, .065, values:[2], order:0),
  CockpitSlot('brake_2', '4', 'pilot', 'brake', .45, .77, .10, .065, values:[4], order:1),
  CockpitSlot('brake_3', '6', 'pilot', 'brake', .58, .77, .10, .065, values:[6], order:2),
  CockpitSlot('coffee_1', 'Kaffee', 'both', 'coffee', .28, .88, .12, .065),
  CockpitSlot('coffee_2', 'Kaffee', 'both', 'coffee', .45, .88, .12, .065),
  CockpitSlot('coffee_3', 'Kaffee', 'both', 'coffee', .62, .88, .12, .065),
];
