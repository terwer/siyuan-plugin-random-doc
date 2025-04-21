<script lang="ts">
  // props
  import RandomDocPlugin from "../index"
  import { onMount } from "svelte"

  export let pluginInstance: RandomDocPlugin
  export let currentRndId: string
  export let dialog

  let visitCount = 0
  let nextReviewDate = ""
  let currentInterval = 1

  const loadReviewData = async () => {
    const attrsRes = await pluginInstance.kernelApi.getBlockAttrs(currentRndId)
    const attrs = attrsRes.data
    visitCount = parseInt(attrs["custom-visit-count"] || "0")
    nextReviewDate = attrs["custom-next-review"] || "未设置"
    currentInterval = parseFloat(attrs["custom-interval"] || "1")
  }

  const onOk = async () => {
    dialog.destroy()
  }

  const onCancel = async () => {
    dialog.destroy()
  }

  onMount(async () => {
    await loadReviewData()
  })
</script>

<div class="review-data-panel">
  <h3>📊 当前文档复习数据</h3>
  <div class="data-item">
    <span>复习次数：</span>
    <span>{visitCount}</span>
  </div>
  <div class="data-item">
    <span>下次复习：</span>
    <span>{nextReviewDate}</span>
  </div>
  <div class="data-item">
    <span>间隔天数：</span>
    <span>{currentInterval}</span>
  </div>

  <!--
  <div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel" on:click={onCancel}>{pluginInstance.i18n.cancel}</button>
    <div class="fn__space" />
    <button class="b3-button b3-button--text" on:click={onOk}>{pluginInstance.i18n.ok}</button>
  </div>
  -->
</div>

<style>
  .review-data-panel {
    border: 1px solid var(--b3-theme-primary);
    padding: 15px;
    margin: 20px 10px;
    border-radius: 8px;
  }
  .data-item {
    display: flex;
    justify-content: space-between;
    margin: 8px 0;
  }
</style>
