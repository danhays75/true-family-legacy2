import List "mo:core/List";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Cycles "mo:base/ExperimentalCycles";
import Family "Family";
import Principal "mo:core/Principal";

import Migration "migration";

(with migration = Migration.run) actor {

  // --- Shared types (exported via bindgen) ---
  public type EdgeKind = { #childOf; #spouseOriginOf };

  public type FamilyRecord = {
    familyId : Text;
    canisterId : Principal;
    rootName : Text;
    createdAt : Int;
    parentFamilyId : ?Text;
  };

  public type EdgeRecord = {
    fromFamilyId : Text;
    toFamilyId : Text;
    kind : EdgeKind;
    viaPersonName : Text;
  };

  // --- State ---
  let families : List.List<FamilyRecord> = List.empty();
  let edges : List.List<EdgeRecord> = List.empty();
  let state = { var nextFamilyIndex : Nat = 1 };

  // --- Endpoints ---

  /// Create a new child Family canister, fund it, register it, and optionally
  /// add a #childOf edge to the parent family.
  public func plantTree(
    rootName : Text,
    parentFamilyId : ?Text,
  ) : async { #ok : (Text, Principal); #err : Text } {
    let familyId = "fam-" # state.nextFamilyIndex.toText();
    state.nextFamilyIndex += 1;
    Cycles.add<system>(1_000_000_000_000);
    let child = await (system Family.Family)(#new { settings = null })(rootName, familyId);
    let childPrincipal = Principal.fromActor(child);
    let record : FamilyRecord = {
      familyId;
      canisterId = childPrincipal;
      rootName;
      createdAt = Time.now();
      parentFamilyId;
    };
    families.add(record);
    ignore await child.initSelfId(childPrincipal.toText());
    switch (parentFamilyId) {
      case null {};
      case (?pid) {
        let edge : EdgeRecord = {
          fromFamilyId = familyId;
          toFamilyId = pid;
          kind = #childOf;
          viaPersonName = "auto";
        };
        edges.add(edge);
      };
    };
    #ok(familyId, childPrincipal)
  };

  /// Return all registered family records.
  public query func listFamilies() : async [FamilyRecord] {
    families.toArray()
  };

  /// Return all relationship edges.
  public query func listEdges() : async [EdgeRecord] {
    edges.toArray()
  };

  /// Add a relationship edge between two existing families.
  public func linkFamilies(
    fromFamilyId : Text,
    toFamilyId : Text,
    kind : EdgeKind,
    viaPersonName : Text,
  ) : async { #ok; #err : Text } {
    let fromExists = families.find(func(r : FamilyRecord) : Bool { r.familyId == fromFamilyId });
    let toExists = families.find(func(r : FamilyRecord) : Bool { r.familyId == toFamilyId });
    switch (fromExists, toExists) {
      case (null, _) { #err("Family not found: " # fromFamilyId) };
      case (_, null) { #err("Family not found: " # toFamilyId) };
      case (?_, ?_) {
        let edge : EdgeRecord = { fromFamilyId; toFamilyId; kind; viaPersonName };
        edges.add(edge);
        #ok
      };
    };
  };

  /// Return the current build stamp — changes on every upgrade so upgrades are observable.
  public query func getBuildStamp() : async Text { return "build-2" };

  /// Call the child canister's whoAmI() and return its response.
  public func pingChild(familyId : Text) : async { #ok : Text; #err : Text } {
    let found = families.find(func(r : FamilyRecord) : Bool { r.familyId == familyId });
    switch (found) {
      case null { #err("Family not found: " # familyId) };
      case (?record) {
        let child = actor (record.canisterId.toText()) : actor {
          whoAmI : shared query () -> async Text;
        };
        let response = await child.whoAmI();
        #ok(response)
      };
    };
  };
};
