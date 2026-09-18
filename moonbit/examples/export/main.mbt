///| A renderer-free consumer of all four libraries: a Chinese command becomes typed
///| parameters (zhnum inside motion), a model proposal is guarded (agent), a structure
///| is named bilingually (anatomy), and deterministic pose frames are exported as CSV
///| for every catalogued motion. Pipe the output to a file to build teaching cards or
///| regression fixtures without a browser.
fn main raise {
  let command = "手距一点五倍肩宽，夹角六十度"
  assert_eq(@zhnum.normalize_numerals(command), "手距1.5倍肩宽，夹角60度")
  let parsed = @motion.parse_query("push_up", command, []).unwrap()
  assert_true(parsed.recognized)
  let allowed = @agent.parse_allowlist(
    "push_up^handWidth,elbowAngle~squat^stanceWidth,toeAngle,squatDepth~curl^",
  )
  let accepted = @agent.guard_command("push_up", [("handWidth", 1.5), ("invented", 7.0)], allowed)
  assert_eq(@agent.action_wire(accepted), "command|push_up|handWidth=1.5")
  assert_eq(@agent.action_wire(@agent.guard_command("run_marathon", [], allowed)), "none")
  assert_eq(@anatomy.structure_name_zh("Left femur", @anatomy.kind_from_string("bone")), "左侧股骨")
  println(
    "motion,phase,depth,excursion,root_y,root_z,torso_x,hand_width,elbow_angle,stance_width,toe_angle",
  )
  let mut rows = 0
  for motion in @motion.catalog() {
    for phase in [0.0, 0.25, 0.5, 0.75, 1.0] {
      let values = if motion.id == "push_up" { parsed.values } else { [] }
      let pose = @motion.pose_intent(motion.id, phase, values).unwrap()
      assert_eq(pose, @motion.pose_intent(motion.id, phase, values).unwrap())
      println(
        "\{motion.id},\{phase},\{pose.depth},\{pose.excursion},\{pose.root_y},\{pose.root_z},\{pose.torso_x},\{pose.hand_width},\{pose.elbow_angle},\{pose.stance_width},\{pose.toe_angle}",
      )
      rows += 1
    }
  }
  assert_eq(rows, @motion.catalog().length() * 5)
  println(
    "scenario=export; libraries=motion+zhnum+agent+anatomy; rows=\{rows}; rendererRequired=false; PASS",
  )
}
