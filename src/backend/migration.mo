import List "mo:core/List";
import Principal "mo:core/Principal";

/// Migration module for True Family Legacy factory canister.
/// The factory actor already uses mo:core/List for all state, so this
/// migration is a structural pass-through — no data conversion needed.
/// Its presence satisfies the upgrade-persistence scaffold and allows
/// future schema evolution without data loss.
module {

  // ---- Shared types (duplicated from main.mo — cannot import main.mo) ----

  type EdgeKind = { #childOf; #spouseOriginOf };

  type FamilyRecord = {
    familyId : Text;
    canisterId : Principal;
    rootName : Text;
    createdAt : Int;
    parentFamilyId : ?Text;
  };

  type EdgeRecord = {
    fromFamilyId : Text;
    toFamilyId : Text;
    kind : EdgeKind;
    viaPersonName : Text;
  };

  // ---- Actor state shape (current) ----
  // All fields already use mo:core types — no OrderedMap/OrderedSet/ListBase.

  public type OldActor = {
    families : List.List<FamilyRecord>;
    edges : List.List<EdgeRecord>;
    state : { var nextFamilyIndex : Nat };
  };

  public type NewActor = {
    families : List.List<FamilyRecord>;
    edges : List.List<EdgeRecord>;
    state : { var nextFamilyIndex : Nat };
  };

  // ---- Migration run function ----
  // Pass-through: state shape is identical across this upgrade.
  // When future builds change the schema, update OldActor/NewActor and
  // add field transformations here before deploying.
  public func run(old : OldActor) : NewActor {
    {
      families = old.families;
      edges = old.edges;
      state = old.state;
    };
  };
};
