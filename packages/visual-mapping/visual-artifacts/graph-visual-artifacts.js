import { VisualArtifacts } from "./visual-artifacts";
import { CHANNEL_TYPES, MARK_TYPES } from "@wimmics/venus-core";

export class ForceGraphVisualArtifacts extends VisualArtifacts {
	
	_processChartSpecificArtifacts() {
		const { encoding, marks, data } = this._payload
		
		for (let role of ["target", "source"]) {
			if (!encoding?.nodes?.[role]) continue
			
			this._processMarkArtifacts({
				mark: MARK_TYPES.NODES,
				config: encoding?.nodes?.[role],
				data: data?.nodes,
				role: role
			})
		}
	}
	
	_resolveActiveArtifacts() {
		const { encoding } = this._payload || {};
		const nodeEncoding = encoding?.nodes || {};

		const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

		const hasBaseConfig = (name) => hasOwn(nodeEncoding, name);

		const hasRoleConfig = (role, name) => hasOwn(nodeEncoding?.[role], name);

		const shouldRemoveNodeItem = (item, nameKey) => {
			if (item?.mark !== "nodes") return false;

			const role = item.role || null;
			const name = item[nameKey];

			if (!name) return false;

			const baseExplicit = hasBaseConfig(name);
			const sourceExplicit = hasRoleConfig("source", name);
			const targetExplicit = hasRoleConfig("target", name);
			const roleExplicit = role ? hasRoleConfig(role, name) : false;
			const anyRoleExplicit = sourceExplicit || targetExplicit;

			// Keep explicitly configured source/target artifact.
			if (role && roleExplicit) return false;

			// Remove inherited source/target default only when base nodes.channel exists.
			if (role && baseExplicit) return true;

			// Remove base nodes.channel only when source/target explicitly overrides it.
			if (!role && anyRoleExplicit) return true;

			return false;
		};

		this.channels = this.channels.filter(
			(channel) => !shouldRemoveNodeItem(channel, "channel")
		);

		const activeScaleIds = new Set(this.channels.map((channel) => channel.scaleId).filter(Boolean))

		this.legends = this.legends.filter((legend) => {
			if (legend?.mark !== "nodes") return true;
			if (!legend?.scaleId) return true;
			return activeScaleIds.has(legend.scaleId);
		});

		for (const scaleId of [...this.scales.keys()]) {
			if (!scaleId.startsWith("nodes.")) continue;
			if (!activeScaleIds.has(scaleId)) { this.scales.delete(scaleId) }
		}
	}
}