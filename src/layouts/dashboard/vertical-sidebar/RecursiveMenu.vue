<template>
  <v-list-item
    v-for="item in menuItems.directItems"
    :key="item.name"
    :to="item.path"
    class="menu-item"
    link
    exact
    @click="setActiveItem(item.name)"
  >
    <template #prepend>
      <span v-if="props.depth >= 1" class="item-dot" :class="{ 'item-dot--active': activeItem === item.name }" aria-hidden="true" />
      <v-icon :icon="item.meta.icon" size="20" class="item-icon" />
    </template>

    <v-list-item-title :style="titleStyle">
      {{ item.meta.title }}
    </v-list-item-title>
  </v-list-item>

  <v-list-group
    v-for="(subGroup, groupName) in menuItems.subGroups"
    :key="createGroupKey(groupName)"
    :value="createGroupKey(groupName)"
    class="menu-group"
    :class="`depth-${props.depth}`"
  >
    <template #activator="{ props: activatorProps }">
      <v-list-item
        v-bind="activatorProps"
        :class="[props.depth === 0 ? 'menu-header' : 'menu-subheader', { 'menu-subheader--active': isGroupActive(subGroup) }]"
      >
        <template #prepend>
          <div class="prepend-wrap">
            <span v-if="props.depth >= 1" class="sub-line" aria-hidden="true" />
            <v-icon v-if="menuItems.subGroupIcons?.[groupName]" :icon="menuItems.subGroupIcons[groupName]" size="20" class="sub-icon" />
          </div>
        </template>

        <v-list-item-title :style="titleStyle">
          {{ groupName }}
        </v-list-item-title>
      </v-list-item>
    </template>

    <RecursiveMenu :menu-items="subGroup" :parent-path="createGroupKey(groupName)" :depth="props.depth + 1" />
  </v-list-group>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const props = defineProps({
  menuItems: { type: Object, required: true },
  parentPath: { type: String, default: '' },
  depth: { type: Number, default: 0 }
});

const route = useRoute();
const activeItem = ref('');
const titleStyle = computed(() => ({
  fontSize: `${14 - props.depth * 0.4}px`
}));

function setActiveItem(name) {
  activeItem.value = name;
}

function createGroupKey(groupName) {
  return props.parentPath ? `${props.parentPath}::${groupName}` : groupName;
}

function isGroupActive(node) {
  if (node.directItems.some((item) => item.path === route.path)) {
    return true;
  }
  return Object.values(node.subGroups).some((sub) => isGroupActive(sub));
}

function syncActiveFromRoute() {
  for (const item of props.menuItems.directItems) {
    if (item.path === route.path) {
      activeItem.value = item.name;
      break;
    }
  }
}

onMounted(syncActiveFromRoute);
</script>

<style>
.custom-sidebar {
  --base-vl: 20px;
  --step-vl: 10px;

  --base-sub: 28px;
  --step-sub: 8px;

  --base-item: 52px;
  --step-item: 10px;

  --color-active: #31beff;
  --color-active-dim: rgba(49, 190, 255, 0.55);
  --color-active-text: #00aeff;
  --color-hover: #1981b1;
}

.v-list-item.menu-header {
  padding-inline-start: 14px !important;
}

.v-list-item.menu-subheader {
  padding-inline-start: var(--pad-sub, var(--base-sub)) !important;
}

.v-list-item.menu-item {
  padding-inline-start: calc(var(--pad-item, var(--base-item) ) - 5px )!important;
}

.v-list-item.menu-header .v-list-item__prepend,
.v-list-item.menu-subheader .v-list-item__prepend {
  margin-right: 6px !important;
}

.v-list-item.menu-item .v-list-item__spacer {
  width: 6px !important;
}

.menu-group.depth-0 {
  --pad-sub: var(--base-sub);
  --pad-item: var(--base-item);
  --vl-x: var(--base-vl);
}

.menu-group.depth-1 {
  /* --pad-sub: calc(var(--base-sub) + var(--step-sub) * 1);
  --pad-item: calc(var(--base-item) + var(--step-item) * 1); */
  --vl-x: calc(var(--base-vl) + var(--step-vl) * 1);
}

.menu-group.depth-2 {
  --pad-sub: calc(var(--base-sub) + var(--step-sub) * 1);
  --pad-item: calc(var(--base-item) + var(--step-item) * 1);
  --vl-x: calc(var(--base-vl) + var(--step-vl) * 2);
}

.menu-group.depth-3 {
  --pad-sub: calc(var(--base-sub) + var(--step-sub) * 3);
  --pad-item: calc(var(--base-item) + var(--step-item) * 3);
  --vl-x: calc(var(--base-vl) + var(--step-vl) * 3);
}

.menu-group.depth-4 {
  --pad-sub: calc(var(--base-sub) + var(--step-sub) * 4);
  --pad-item: calc(var(--base-item) + var(--step-item) * 4);
  --vl-x: calc(var(--base-vl) + var(--step-vl) * 4);
}

.menu-group.depth-5 {
  --pad-sub: calc(var(--base-sub) + var(--step-sub) * 5);
  --pad-item: calc(var(--base-item) + var(--step-item) * 5);
  --vl-x: calc(var(--base-vl) + var(--step-vl) * 5);
}

.menu-group {
  position: relative;
}

.menu-group.v-list-group--open::before {
  content: '';
  position: absolute;
  top: 44px;
  bottom: 2px;
  left: var(--vl-x, var(--base-vl));
  width: 1.5px;
  background-color: var(--color-active-dim);
  z-index: 1;
  pointer-events: none;
  border-radius: 2px;
  transition: background-color 0.25s ease;
}

.menu-group.v-list-group--open:has(.v-list-item--active)::before {
  background-color: var(--color-active);
  opacity: 0.8;
}

.sub-line {
  display: inline-block;
  width: 10px;
  height: 1.5px;
  background-color: rgba(0, 0, 0, 0.18);
  margin-right: 4px;
  flex-shrink: 0;
  border-radius: 2px;
  transition: background-color 0.25s ease;
}

.v-list-item.menu-subheader.v-list-item--active .sub-line,
.v-list-item.menu-subheader.menu-subheader--active .sub-line {
  background-color: var(--color-active);
}

.item-dot {
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: rgb(var(--v-theme-borderLight));
  margin-right: 6px;
  flex-shrink: 0;
  transition: background-color 0.25s ease;
}

.item-dot.item-dot--active {
  background-color: var(--color-active);
}

.prepend-wrap {
  display: flex;
  align-items: center;
}

.sub-icon,
.item-icon {
  margin-left: 0;
}

.v-list-item {
  color: rgb(var(--v-theme-darkText));
}
.v-list-item .v-icon {
  color: rgb(var(--v-theme-darkText));
}

.menu-group.depth-0 > .v-list-group__header > .v-list-item.menu-header.v-list-item--active {
  background-color: var(--color-active) !important;
  color: #fff !important;
  border-radius: 12px 0 0 12px;
}
.menu-group.depth-0 > .v-list-group__header > .v-list-item.menu-header.v-list-item--active .v-list-item-title,
.menu-group.depth-0 > .v-list-group__header > .v-list-item.menu-header.v-list-item--active .v-icon {
  color: #fff !important;
  font-weight: 600 !important;
}

.menu-group.depth-1 .v-list-item.menu-subheader.v-list-item--active,
.menu-group.depth-2 .v-list-item.menu-subheader.v-list-item--active,
.menu-group.depth-3 .v-list-item.menu-subheader.v-list-item--active,
.menu-group.depth-4 .v-list-item.menu-subheader.v-list-item--active,
.menu-group.depth-5 .v-list-item.menu-subheader.v-list-item--active {
  background-color: transparent !important;
  color: inherit !important;
}
.menu-group.depth-1 .v-list-item.menu-subheader.v-list-item--active .v-list-item-title,
.menu-group.depth-2 .v-list-item.menu-subheader.v-list-item--active .v-list-item-title,
.menu-group.depth-3 .v-list-item.menu-subheader.v-list-item--active .v-list-item-title,
.menu-group.depth-4 .v-list-item.menu-subheader.v-list-item--active .v-list-item-title,
.menu-group.depth-5 .v-list-item.menu-subheader.v-list-item--active .v-list-item-title,
.menu-group.depth-1 .v-list-item.menu-subheader.v-list-item--active .v-icon,
.menu-group.depth-2 .v-list-item.menu-subheader.v-list-item--active .v-icon,
.menu-group.depth-3 .v-list-item.menu-subheader.v-list-item--active .v-icon,
.menu-group.depth-4 .v-list-item.menu-subheader.v-list-item--active .v-icon,
.menu-group.depth-5 .v-list-item.menu-subheader.v-list-item--active .v-icon {
  color: inherit !important;
  font-weight: normal !important;
}

.v-list-item.menu-item.v-list-item--active {
  background-color: transparent !important;
  color: var(--color-active-text) !important;
  font-weight: 600 !important;
}
.v-list-item.menu-item.v-list-item--active .v-icon {
  color: var(--color-active-text) !important;
}

.v-list-group--active > .v-list-group__header > .v-list-item {
  background-color: transparent !important;
  color: inherit !important;
}

.v-list-item {
  transition:
    transform 0.15s ease,
    color 0.15s ease;
}
.v-list-item:hover {
  color: var(--color-hover) !important;
  transform: translateX(3px);
}
.v-list-item.v-list-item--active:hover {
  transform: none;
}

.v-list-item,
.v-list-group .v-list-item.v-list-group__header {
  border-top-left-radius: 10px !important;
  border-bottom-left-radius: 10px !important;
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

.v-list-group .v-list-item__append .v-icon {
  transform: rotate(-90deg) !important;
  transition: transform 0.2s ease-in-out;
}
.v-list-group--open > .v-list-group__header > .v-list-item__append .v-icon {
  transform: rotate(-180deg) !important;
}

.v-list-group {
  transition: all 0.2s ease;
}
</style>
