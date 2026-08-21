use std::collections::HashMap;
use std::hash::Hash;

/// A union-find (disjoint set) structure with path compression and
/// union by rank, generic over any hashable, cloneable key type.
pub struct DisjointSet<T: Eq + Hash + Clone> {
    parent: HashMap<T, T>,
    rank: HashMap<T, usize>,
}

impl<T: Eq + Hash + Clone> DisjointSet<T> {
    pub fn new() -> Self {
        DisjointSet {
            parent: HashMap::new(),
            rank: HashMap::new(),
        }
    }

    pub fn make_set(&mut self, item: T) {
        if !self.parent.contains_key(&item) {
            self.parent.insert(item.clone(), item.clone());
            self.rank.insert(item, 0);
        }
    }

    pub fn find(&mut self, item: &T) -> T {
        let parent = self.parent.get(item).cloned().unwrap_or_else(|| item.clone());
        if &parent != item {
            let root = self.find(&parent);
            self.parent.insert(item.clone(), root.clone());
            return root;
        }
        parent
    }

    pub fn union(&mut self, a: &T, b: &T) {
        let root_a = self.find(a);
        let root_b = self.find(b);
        if root_a == root_b {
            return;
        }

        let rank_a = *self.rank.get(&root_a).unwrap_or(&0);
        let rank_b = *self.rank.get(&root_b).unwrap_or(&0);

        if rank_a < rank_b {
            self.parent.insert(root_a, root_b);
        } else if rank_a > rank_b {
            self.parent.insert(root_b, root_a);
        } else {
            self.parent.insert(root_b, root_a.clone());
            self.rank.insert(root_a, rank_a + 1);
        }
    }

    pub fn connected(&mut self, a: &T, b: &T) -> bool {
        self.find(a) == self.find(b)
    }
}
